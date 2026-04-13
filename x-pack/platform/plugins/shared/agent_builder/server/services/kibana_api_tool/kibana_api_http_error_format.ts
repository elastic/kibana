/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAxiosError } from 'axios';

const MAX_BODY_CHARS = 12_000;

function serializeResponseData(data: unknown): string {
  if (data === undefined || data === null) {
    return '(empty)';
  }
  if (typeof data === 'string') {
    return data.length > MAX_BODY_CHARS ? `${data.slice(0, MAX_BODY_CHARS)}…` : data;
  }
  try {
    const s = JSON.stringify(data, null, 2);
    return s.length > MAX_BODY_CHARS ? `${s.slice(0, MAX_BODY_CHARS)}…` : s;
  } catch {
    const s = String(data);
    return s.length > MAX_BODY_CHARS ? `${s.slice(0, MAX_BODY_CHARS)}…` : s;
  }
}

/**
 * Produces a multi-line message for tool / LLM consumption when loopback Kibana HTTP fails.
 */
export function formatKibanaApiHttpFailure(error: unknown, requestUrl: string): string {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : String(error);
  }

  const lines: string[] = [];
  const status = error.response?.status;
  const statusText = error.response?.statusText;
  if (status !== undefined) {
    lines.push(`HTTP ${status}${statusText ? ` ${statusText}` : ''}`);
  } else {
    lines.push('HTTP request failed (no response status)');
  }

  lines.push(`URL: ${requestUrl}`);

  if (error.response?.data !== undefined) {
    lines.push(`Response body:\n${serializeResponseData(error.response.data)}`);
  }

  if (error.code) {
    lines.push(`Transport code: ${error.code}`);
  }

  if (error.message && !error.message.startsWith('Request failed with status code')) {
    lines.push(`Client message: ${error.message}`);
  }

  return lines.join('\n');
}
