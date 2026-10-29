/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `labels.env` and `prod` become `{ labels: { env: 'prod' } }`. */
const toNestedObject = (path: string, value: string): Record<string, unknown> => {
  const keys = path.split('.');
  const result: Record<string, unknown> = {};
  let cursor = result;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    const next: Record<string, unknown> = {};
    cursor[key] = next;
    cursor = next;
  });
  return result;
};

/** POC: a sample webhook body for the example request. Mirrors the server's test payload shape. */
export const buildExamplePayload = (fingerprintField?: string): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    title: 'CPU usage is high',
    message: 'CPU above 90% for 5 minutes',
    severity: 'high',
  };
  if (fingerprintField) {
    return { ...payload, ...toNestedObject(fingerprintField, 'host-1') };
  }
  return payload;
};

/** A copyable curl command that sends one alert to the import's webhook. */
export const buildCurlExample = ({
  url,
  token,
  fingerprintField,
  payload = buildExamplePayload(fingerprintField),
}: {
  url: string;
  token: string;
  fingerprintField?: string;
  /** Replaces the generic sample body, for sources that expect a specific shape. */
  payload?: Record<string, unknown>;
}): string =>
  [
    `curl -X POST '${url}' \\`,
    `  -H 'Authorization: Bearer ${token}' \\`,
    "  -H 'Content-Type: application/json' \\",
    `  -d '${JSON.stringify(payload)}'`,
  ].join('\n');
