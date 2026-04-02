/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Scout reuses one Elasticsearch role name per worker; keep one SAML role per spec file. */
export const INTEGRATION_API_BASE_PATH = 'api/automatic_import/integrations';

export const SHARED_INTEGRATION_ID = 'scout-integration-shared';

export const NON_EXISTENT_INTEGRATION_ID = 'non-existent-scout-test-id';

export const DATA_STREAMS_INTEGRATION_ID = 'scout-ds-test-integration';

/** Dedicated integration for manager happy-path data stream flow (upload → patch → results → delete). */
export const MANAGER_DS_FLOW_INTEGRATION_ID = 'scout-ds-manager-flow';

export const MANAGER_DS_FLOW_DATA_STREAM_ID = 'scout-ds-manager-flow-ds';

export const dataStreamsApiBasePath = (integrationId: string): string =>
  `api/automatic_import/integrations/${integrationId}/data_streams`;

/** Normalizes Scout HTTP error bodies (Boom/wrapped) for substring assertions */
export const scoutApiErrorText = (body: unknown): string => {
  if (body == null) {
    return '';
  }
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const msg = (body as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
};
