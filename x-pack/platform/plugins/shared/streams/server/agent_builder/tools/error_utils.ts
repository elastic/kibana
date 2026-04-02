/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const classifyError = (err: unknown, listToolId: string): string => {
  const message = err instanceof Error ? err.message : String(err);
  const statusCode = (err as { statusCode?: number }).statusCode;

  if (
    statusCode === 404 ||
    message.includes('not found') ||
    message.includes('Cannot find stream')
  ) {
    return `Stream not found. Use ${listToolId} to discover available streams.`;
  }
  if (message.includes('security_exception')) {
    return 'Insufficient index privileges. The API key or user may need additional permissions (e.g. monitor, read).';
  }
  if (message.includes('verification_exception')) {
    return 'Query verification failed — a field referenced in the query may not exist in the index mapping.';
  }
  if (message.includes('No connector available')) {
    return 'No inference connector configured. Configure an LLM connector in Kibana Stack Management to enable natural language querying.';
  }
  return 'Unexpected server error.';
};
