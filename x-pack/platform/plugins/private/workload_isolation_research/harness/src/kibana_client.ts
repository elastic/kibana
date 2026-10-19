/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface KibanaTarget {
  readonly url: string;
  readonly authHeader: string;
}

/** Resolves the Kibana target from env without ever logging credentials. */
export const targetFromEnv = (): KibanaTarget => {
  const url = (process.env.WIR_KIBANA_URL ?? 'http://localhost:5601').replace(/\/$/, '');
  const apiKey = process.env.WIR_KIBANA_API_KEY;
  const basic = process.env.WIR_KIBANA_BASIC ?? 'elastic:changeme';
  const authHeader = apiKey ? `ApiKey ${apiKey}` : `Basic ${Buffer.from(basic).toString('base64')}`;
  return { url, authHeader };
};

export const kbn = async <T = unknown>(
  target: KibanaTarget,
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = 120000
): Promise<{ status: number; body: T }> => {
  const res = await fetch(`${target.url}${path}`, {
    method,
    headers: {
      authorization: target.authHeader,
      'kbn-xsrf': 'workload-isolation-research',
      'x-elastic-internal-origin': 'kibana',
      'elastic-api-version': path.startsWith('/internal') ? '1' : '2023-10-31',
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // keep text
  }
  return { status: res.status, body: parsed as T };
};

export const API = '/internal/workload_isolation_research';
