/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { addSpaceIdToPath, getSpaceIdFromPath } from '@kbn/core-spaces-common';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import type { WorkflowApi } from '@kbn/workflows-ui';
import { buildImportWorkflowYaml } from './build_import_workflow_yaml';
import { toImportSource } from './import_form';
import type { ImportFormState } from './import_form';

const INBOUND_WEBHOOK_CONNECTOR_TYPE_ID = '.inboundWebhook';
const CONNECTOR_API_PATH = '/api/actions/connector';
const INTERNAL_CONNECTOR_API_PATH = '/internal/actions/connector';

export interface CreatedImport {
  connectorId: string;
  /** The same as `connectorId`, so either one finds the other. */
  workflowId: string;
  /** Where the source system sends payloads. */
  url: string;
  /** Shown once: it cannot be read again without rotating. */
  token: string;
  /** False when `server.publicBaseUrl` is not set and the URL is built from the browser address. */
  isPublicBaseUrlConfigured: boolean;
}

export type ImportSetupStep = 'create_connector' | 'create_token' | 'create_workflow';

/** Failure of one setup step. Whatever the earlier steps created has been removed. */
export class ImportSetupError extends Error {
  constructor(public readonly step: ImportSetupStep, cause: unknown) {
    super(getErrorMessage(cause));
    this.name = 'ImportSetupError';
  }
}

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'body' in error) {
    const { body } = error as { body?: { message?: unknown } };
    if (typeof body?.message === 'string') {
      return body.message;
    }
  }
  return error instanceof Error ? error.message : String(error);
};

const isUsablePublicBaseUrl = (value: string | undefined): value is string =>
  Boolean(value) && value !== '/';

/** Same URL the connector flyout shows: the public base URL, the space, then the events path. */
const buildWebhookUrl = (
  http: HttpStart,
  connectorId: string
): Pick<CreatedImport, 'url' | 'isPublicBaseUrlConfigured'> => {
  const { basePath } = http;
  const { spaceId } = getSpaceIdFromPath(basePath.get(), basePath.serverBasePath);
  const { publicBaseUrl } = basePath;
  const isPublicBaseUrlConfigured = isUsablePublicBaseUrl(publicBaseUrl);
  const baseUrl = isUsablePublicBaseUrl(publicBaseUrl)
    ? publicBaseUrl
    : `${window.location.origin}${basePath.serverBasePath}`;
  const path = `/api/actions/events/${encodeURIComponent(
    INBOUND_WEBHOOK_CONNECTOR_TYPE_ID
  )}/${encodeURIComponent(connectorId)}`;

  return { url: addSpaceIdToPath(baseUrl, spaceId, path), isPublicBaseUrlConfigured };
};

const getInvalidWorkflowError = () =>
  new Error(
    i18n.translate('xpack.alertingV2.imports.setup.invalidWorkflow', {
      defaultMessage: 'The generated workflow is invalid.',
    })
  );

/**
 * Sets up a custom import with the existing APIs: an inbound webhook connector, its ingest token,
 * and a workflow that turns its payloads into alerts. The connector and the workflow get the same
 * generated id. On failure the resources created so far are deleted again, and the error names
 * the step that failed.
 */
export const createImport = async ({
  http,
  workflowApi,
  values,
}: {
  http: HttpStart;
  workflowApi: WorkflowApi;
  values: ImportFormState;
}): Promise<CreatedImport> => {
  const name = values.name.trim();
  const source = values.source.trim() || toImportSource(name) || 'import';
  const fingerprintField = values.fingerprintField.trim();
  // A lowercase UUID is also a valid workflow id.
  const id = uuidv4();
  const undo: Array<() => Promise<unknown>> = [];

  let step: ImportSetupStep = 'create_connector';
  try {
    const connector = await http.post<{ id: string }>(
      `${CONNECTOR_API_PATH}/${encodeURIComponent(id)}`,
      {
        body: JSON.stringify({
          name: `Import: ${name}`,
          connector_type_id: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
          config: {},
          secrets: { authType: 'none' },
        }),
      }
    );
    undo.push(() => http.delete(`${CONNECTOR_API_PATH}/${encodeURIComponent(connector.id)}`));

    step = 'create_token';
    const { ingest_token: token } = await http.post<{ ingest_token: string }>(
      `${INTERNAL_CONNECTOR_API_PATH}/${encodeURIComponent(connector.id)}/_rotate_event_token`
    );

    step = 'create_workflow';
    const workflow = await workflowApi.createWorkflow({
      id,
      yaml: buildImportWorkflowYaml({
        name,
        connectorId: connector.id,
        source,
        severity: values.defaultSeverity,
        ...(fingerprintField !== '' ? { fingerprintField } : {}),
      }),
    });
    undo.push(() => workflowApi.deleteWorkflow(workflow.id));
    // An invalid workflow is still saved, but it would never create an alert.
    if (workflow.valid === false) {
      throw getInvalidWorkflowError();
    }

    return {
      connectorId: connector.id,
      workflowId: workflow.id,
      token,
      ...buildWebhookUrl(http, connector.id),
    };
  } catch (error) {
    // Newest first; a failed cleanup must not hide the original error.
    for (const run of [...undo].reverse()) {
      await run().catch(() => undefined);
    }
    throw new ImportSetupError(step, error);
  }
};
