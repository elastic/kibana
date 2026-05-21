/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart, HttpResponse } from '@kbn/core/public';

interface GenerateParams {
  prompt: string;
  connectorId?: string;
  esqlQuery?: string;
  timeRange?: { from: string; to: string };
}

export async function streamGenerate(
  http: HttpStart,
  params: GenerateParams,
  onToken: (token: string) => void,
  signal: AbortSignal
): Promise<void> {
  const httpResponse = await http.post('/internal/ai_summary_panel/generate', {
    body: JSON.stringify(params),
    asResponse: true,
    rawResponse: true,
    signal,
  });

  const reader = (httpResponse as HttpResponse<unknown>).response?.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as { token?: string; error?: string };
        if (event.error) throw new Error(event.error);
        if (event.token) onToken(event.token);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
