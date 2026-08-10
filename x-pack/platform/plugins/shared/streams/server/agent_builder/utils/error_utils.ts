/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_INSPECT_STREAMS_TOOL_ID } from '../tools/tool_ids';

const getStatusCode = (err: unknown): number | undefined => {
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.statusCode === 'number') return obj.statusCode;
    if (typeof obj.status === 'number') return obj.status;
    const meta = obj.meta as Record<string, unknown> | undefined;
    if (typeof meta?.statusCode === 'number') return meta.statusCode;
  }
  return undefined;
};

const getErrorType = (err: unknown): string | undefined => {
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    const body = obj.body as Record<string, unknown> | undefined;
    const errorObj = body?.error as Record<string, unknown> | undefined;
    if (typeof errorObj?.type === 'string') return errorObj.type;
  }
  return undefined;
};

export const classifyError = (err: unknown): string => {
  const message = err instanceof Error ? err.message : String(err);
  const statusCode = getStatusCode(err);
  const errorType = getErrorType(err);

  if (statusCode === 404 || message.includes('Cannot find stream')) {
    return `Stream not found. Use ${STREAMS_INSPECT_STREAMS_TOOL_ID} to discover available streams.`;
  }
  if (
    statusCode === 403 ||
    errorType === 'security_exception' ||
    message.includes('security_exception')
  ) {
    return 'Insufficient index privileges. The API key or user may need additional permissions (e.g. monitor, read).';
  }
  if (errorType === 'verification_exception' || message.includes('verification_exception')) {
    return 'Query verification failed — a field referenced in the query may not exist in the index mapping.';
  }
  if (message.includes('No connector available')) {
    return 'No inference connector configured. Configure an LLM connector in Kibana Stack Management to enable natural language querying.';
  }
  if (statusCode === 409 || message.includes('Could not acquire lock')) {
    return 'Another stream operation is in progress. Try again in a moment.';
  }
  return `Unexpected error: ${message.slice(0, 200)}`;
};
