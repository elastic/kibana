/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

/** Kibana's default `server.maxPayload`, which applies when the import limit is not configured. */
export const DEFAULT_IMPORT_MAX_PAYLOAD_BYTES = 1024 * 1024;

export const IMPORT_MAX_PAYLOAD_SETTING = 'workflowsManagement.import.maxPayloadBytes';

const PAYLOAD_TOO_LARGE_STATUS = 413;
const BAD_GATEWAY_STATUS = 502;

export interface ImportPayloadTooLarge {
  requestBytes: number;
  limitBytes: number;
}

const formatMegabytes = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const getImportPayloadTooLargeMessage = ({
  requestBytes,
  limitBytes,
}: ImportPayloadTooLarge): string =>
  i18n.translate('workflows.importFlyout.payloadTooLarge', {
    defaultMessage:
      'The import is {requestSize}, over the {limitSize} request limit. Import fewer workflows at a time, for example by splitting the ZIP into several files, or ask an administrator to raise {setting} in kibana.yml.',
    values: {
      requestSize: formatMegabytes(requestBytes),
      limitSize: formatMegabytes(limitBytes),
      setting: IMPORT_MAX_PAYLOAD_SETTING,
    },
  });

export class ImportPayloadTooLargeError extends Error {
  constructor(public readonly details: ImportPayloadTooLarge) {
    super(getImportPayloadTooLargeMessage(details));
    this.name = 'ImportPayloadTooLargeError';
  }
}

const getStatus = (error: unknown): number | undefined => {
  if (!(error instanceof Error)) {
    return undefined;
  }
  const { response, body } = error as Partial<IHttpFetchError<{ statusCode?: number }>>;
  return response?.status ?? body?.statusCode;
};

/**
 * Returns the size details when a failed import request was most likely rejected for exceeding
 * the request size limit, `null` otherwise. Kibana answers 413, but the dev server proxy and
 * reverse proxies report the connection closing early as 502, so that status only counts when
 * the body is over the limit.
 */
export const getPayloadTooLarge = (
  error: unknown,
  workflows: Array<{ id: string; yaml: string }>,
  limitBytes: number
): ImportPayloadTooLarge | null => {
  const status = getStatus(error);
  if (status !== PAYLOAD_TOO_LARGE_STATUS && status !== BAD_GATEWAY_STATUS) {
    return null;
  }
  const requestBytes = new TextEncoder().encode(JSON.stringify({ workflows })).byteLength;
  return requestBytes > limitBytes ? { requestBytes, limitBytes } : null;
};
