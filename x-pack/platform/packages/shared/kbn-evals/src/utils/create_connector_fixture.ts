/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { v5 } from 'uuid';
import pRetry from 'p-retry';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { getStatusCode } from './retry_utils';

/**
 * When running locally, only UUIDs are allowed for non-preconfigured connectors.
 * We generate a deterministic UUID from the logical connector id so runs are stable/idempotent.
 */
export function getConnectorIdAsUuid(connectorId: string) {
  return v5(connectorId, v5.DNS);
}

/**
 * Returns the connector id to use at runtime.
 * When `KBN_EVALS_SKIP_CONNECTOR_SETUP` is set, the original id is returned as-is
 * (preconfigured connectors don't need UUID mapping).
 * Otherwise, a deterministic UUID is generated.
 */
export function resolveConnectorId(connectorId: string): string {
  return process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP
    ? connectorId
    : getConnectorIdAsUuid(connectorId);
}

/**
 * Inference connectors may return 400 (not 409) when the backing inference endpoint
 * was created by another parallel worker — treat as success and reuse.
 */
function isAlreadyExistsConnectorError(error: unknown): boolean {
  const status = getStatusCode(error);
  if (status === 409) {
    return true;
  }
  if (status !== 400) {
    return false;
  }
  const data = (error as any)?.response?.data ?? (error as any)?.data;
  const message =
    typeof data === 'object' && data !== null && 'message' in data
      ? String((data as { message: unknown }).message)
      : error instanceof Error
      ? error.message
      : '';
  return /already exists/i.test(message);
}

export async function deleteConnectorById({
  fetch,
  connectorId,
  log,
}: {
  fetch: HttpHandler;
  connectorId: string;
  log: ToolingLog;
}) {
  log.info(`Deleting connector: ${connectorId}`);
  await fetch({
    path: `/api/actions/connector/${connectorId}`,
    method: 'DELETE',
  }).catch((error) => {
    if (getStatusCode(error) === 404) {
      return;
    }
    throw error;
  });
}

/**
 * Returns the inference endpoint id for `.inference` connectors whose config
 * names the backing inference endpoint, or undefined otherwise.
 */
function getInferenceEndpointId(connector: AvailableConnectorWithId): string | undefined {
  if (connector.actionTypeId !== '.inference') {
    return undefined;
  }
  const { inferenceId } = connector.config;
  return typeof inferenceId === 'string' && inferenceId.length > 0 ? inferenceId : undefined;
}

export async function createConnectorFixture({
  predefinedConnector,
  fetch,
  log,
  use,
}: {
  predefinedConnector: AvailableConnectorWithId;
  fetch: HttpHandler;
  log: ToolingLog;
  use: (connector: AvailableConnectorWithId) => Promise<void>;
}) {
  interface ConnectorGetResponse {
    is_preconfigured?: boolean;
  }

  async function inferenceEndpointExists(inferenceId: string): Promise<boolean> {
    const res = (await fetch({
      path: `/internal/_inference/_exists/${encodeURIComponent(inferenceId)}`,
      method: 'GET',
      // versioned internal route: requests without this header are rejected
      headers: { 'elastic-api-version': '1' },
    })) as { isEndpointExists?: boolean };

    return res?.isEndpointExists === true;
  }

  async function waitForInferenceEndpoint(inferenceId: string): Promise<void> {
    const retries = process.env.KBN_EVALS_AWAIT_CCM_CONNECTORS ? 3 : 0;

    await pRetry(
      async () => {
        if (!(await inferenceEndpointExists(inferenceId))) {
          throw new Error(`Inference endpoint [${inferenceId}] does not exist`);
        }
      },
      { retries, minTimeout: 3000, factor: 1 }
    ).catch((error) => {
      throw new Error(
        `Inference endpoint [${inferenceId}] for EIS connector [${predefinedConnector.id}] is not available. ` +
          `EIS connectors bind directly to inference endpoints and are never created as stack connectors, ` +
          `so make sure the EIS/CCM setup has created the endpoint before running evals. ` +
          `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
    });
  }

  async function isPreconfiguredConnector(connectorId: string): Promise<boolean> {
    const retries = process.env.KBN_EVALS_AWAIT_CCM_CONNECTORS ? 3 : 0;

    return pRetry(
      async () => {
        try {
          const res = (await fetch({
            path: `/api/actions/connector/${encodeURIComponent(connectorId)}`,
            method: 'GET',
          })) as ConnectorGetResponse;

          return res?.is_preconfigured === true;
        } catch (error) {
          if (getStatusCode(error) === 404) throw error;
          throw new pRetry.AbortError(error instanceof Error ? error : new Error(String(error)));
        }
      },
      { retries, minTimeout: 3000, factor: 1 }
    ).catch((error) => {
      if (getStatusCode(error) === 404) return false;
      throw error;
    });
  }

  async function createInferenceEndpointIfMissing(inferenceId: string, body: unknown) {
    if (await inferenceEndpointExists(inferenceId)) {
      return;
    }
    log.info(`Creating inference endpoint ${inferenceId} for connector ${predefinedConnector.id}`);
    try {
      await fetch({
        path: '/internal/_inference/_add',
        method: 'POST',
        headers: { 'elastic-api-version': '1' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      if (isAlreadyExistsConnectorError(error)) {
        log.info(`Inference endpoint already exists, reusing: ${inferenceId}`);
      } else {
        throw error;
      }
    }
  }

  if (process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP) {
    log.info(
      `Skipping connector setup/teardown for: ${predefinedConnector.id} (KBN_EVALS_SKIP_CONNECTOR_SETUP is set)`
    );
    await use(predefinedConnector);
    return;
  }

  // `.inference` connectors reference an ES inference endpoint. We bind directly to that endpoint
  // instead of creating a `.inference` stack connector wrapper around it — the inference plugin
  // resolves inference endpoint ids passed as connector ids.
  const inferenceEndpointId = getInferenceEndpointId(predefinedConnector);
  if (inferenceEndpointId) {
    if (predefinedConnector.config.provider === 'elastic') {
      // EIS endpoints are pre-provisioned by EIS/CCM setup and are never created here.
      await waitForInferenceEndpoint(inferenceEndpointId);
      log.info(
        `Binding EIS connector ${predefinedConnector.id} to inference endpoint ${inferenceEndpointId}`
      );
      await use({ ...predefinedConnector, id: inferenceEndpointId });
      return;
    }

    // Endpoint-shaped definitions (e.g. OpenRouter from the CI generator) carry the exact
    // `POST /internal/_inference/_add` body in config/secrets, so create the endpoint when missing.
    await createInferenceEndpointIfMissing(inferenceEndpointId, {
      config: predefinedConnector.config,
      secrets: predefinedConnector.secrets ?? {},
    });

    log.info(
      `Binding connector ${predefinedConnector.id} to inference endpoint ${inferenceEndpointId}`
    );
    await use({ ...predefinedConnector, id: inferenceEndpointId });
    return;
  }

  // Old-shape OpenRouter (and any other `.gen-ai`) eval LLMs are provisioned as ES inference
  // endpoints instead of `.gen-ai` stack connectors: new `.gen-ai` connectors can no longer be
  // created, and the inference plugin resolves inference endpoint ids passed as connector ids.
  if (predefinedConnector.actionTypeId === '.gen-ai') {
    const inferenceId = predefinedConnector.id;
    const { apiUrl, defaultModel } = predefinedConnector.config;

    if (typeof apiUrl !== 'string' || typeof defaultModel !== 'string') {
      throw new Error(
        `Connector [${predefinedConnector.id}] is a .gen-ai connector without config.apiUrl/config.defaultModel. ` +
          `.gen-ai eval connectors are created as chat_completion inference endpoints and require both fields.`
      );
    }

    await createInferenceEndpointIfMissing(inferenceId, {
      config: {
        inferenceId,
        provider: 'openai',
        taskType: 'chat_completion',
        providerConfig: {
          model_id: defaultModel,
          url: apiUrl,
        },
      },
      secrets: {
        providerSecrets: {
          api_key: predefinedConnector.secrets?.apiKey,
        },
      },
    });

    log.info(`Binding connector ${predefinedConnector.id} to inference endpoint ${inferenceId}`);
    await use({ ...predefinedConnector, id: inferenceId });
    return;
  }

  // If this connector is already preconfigured in the Kibana instance (e.g. connectors declared
  // via `xpack.actions.preconfigured` in a local kibana.yml), we should reuse it rather than
  // creating/deleting a saved object connector.
  if (await isPreconfiguredConnector(predefinedConnector.id)) {
    log.info(`Reusing preconfigured connector: ${predefinedConnector.id}`);
    await use(predefinedConnector);
    return;
  }

  // When running locally, the connectors we read from kibana.yml
  // are not configured in the kibana instance, so we install the
  // one for this test run. only UUIDs are allowed for non-preconfigured
  // connectors, so we generate a seeded uuid using the preconfigured
  // connector id.
  const connectorIdAsUuid = getConnectorIdAsUuid(predefinedConnector.id);

  const connectorWithUuid = {
    ...predefinedConnector,
    id: connectorIdAsUuid,
  };

  log.info(`Creating connector: ${predefinedConnector.id} as ${connectorIdAsUuid}`);

  try {
    await fetch({
      path: `/api/actions/connector/${connectorWithUuid.id}`,
      method: 'POST',
      body: JSON.stringify({
        config: connectorWithUuid.config,
        connector_type_id: connectorWithUuid.actionTypeId,
        name: connectorWithUuid.name,
        secrets: connectorWithUuid.secrets,
      }),
    });
  } catch (error) {
    if (isAlreadyExistsConnectorError(error)) {
      log.info(`Connector or inference endpoint already exists, reusing: ${connectorIdAsUuid}`);
    } else {
      throw error;
    }
  }

  await use(connectorWithUuid);
}
