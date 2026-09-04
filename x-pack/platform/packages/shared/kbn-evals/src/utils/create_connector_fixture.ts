/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import pRetry from 'p-retry';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { getStatusCode } from './retry_utils';
import { createStackConnectorFixture } from './create_stack_connector_fixture';

/**
 * Inference connectors may return 400 (not 409) when the backing inference endpoint
 * was created by another parallel worker — treat as success and reuse.
 */
function isAlreadyExistsEndpointError(error: unknown): boolean {
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

/**
 * Routes to the appropriate provisioning strategy based on the connector definition shape:
 *
 * - `KBN_EVALS_SKIP_CONNECTOR_SETUP` → use predefinedConnector as-is (no-op)
 * - `.inference` with `config.inferenceId` + `provider === 'elastic'` (EIS) → wait for the
 *   pre-provisioned endpoint; bind to it without touching the Actions API
 * - `.inference` with `config.inferenceId` + other provider (OpenRouter) → create the inference
 *   endpoint if missing; bind to it without touching the Actions API
 * - everything else → delegate to `createStackConnectorFixture` (generic Actions API path)
 */
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
        let exists: boolean;
        try {
          exists = await inferenceEndpointExists(inferenceId);
        } catch (error) {
          const status = getStatusCode(error);
          // Abort immediately on permanent client errors.
          if (status === 400 || status === 401 || status === 403) {
            throw new pRetry.AbortError(error instanceof Error ? error : new Error(String(error)));
          }
          throw error;
        }
        if (!exists) {
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
      if (isAlreadyExistsEndpointError(error)) {
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

  // Non-LLM connectors (e.g. `.email`, `.slack`, `.gen-ai`) go through the generic Actions API.
  await createStackConnectorFixture({ predefinedConnector, fetch, log, use });
}
