/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInferenceInternalError, InferenceTaskInternalError } from '@kbn/inference-common';

const connectorStatusCodeRegexp = /Status code: ([0-9]{3})/i;
const inferenceStatusCodeRegexp = /status \[([0-9]{3})\]/i;

export const convertUpstreamError = (
  source: string | Error,
  { statusCode, messagePrefix }: { statusCode?: number; messagePrefix?: string } = {}
): InferenceTaskInternalError => {
  const message = typeof source === 'string' ? source : source.message;

  let status = statusCode;
  if (!status && typeof source === 'object') {
    status = (source as any).status ?? (source as any).response?.status;
  }
  if (!status) {
    const match = connectorStatusCodeRegexp.exec(message);
    if (match) {
      status = parseInt(match[1], 10);
    }
  }
  if (!status) {
    const match = inferenceStatusCodeRegexp.exec(message);
    if (match) {
      status = parseInt(match[1], 10);
    }
  }

  const messageWithPrefix = messagePrefix ? `${messagePrefix} ${message}` : message;

  return createInferenceInternalError(messageWithPrefix, { status });
};
