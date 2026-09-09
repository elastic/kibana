/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const HTTP_CONNECTOR_TYPE_ID = '.http';

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Params forwarded to the connector. `url` is deliberately absent: the HTTP connector
 * resolves `params.url || config.url` and attaches the stored credentials to whichever
 * host it ends up with, so accepting it would let the sandbox redirect the connector at
 * an arbitrary host and exfiltrate those credentials. `path` cannot escape the base URL
 * (it is assigned to `URL.pathname`), so it is safe to forward.
 */
const FORWARDED_PARAMS = ['path', 'query', 'headers', 'body', 'form_data'];

export type HttpConnectorParamsResult =
  | { params: Record<string, unknown> }
  | { errorMessage: string };

/**
 * Maps a `sandbox-cb` style call onto the HTTP connector's native (non-sub-action) params.
 */
export const buildHttpConnectorParams = (
  subAction: string,
  subActionParams: Record<string, unknown>
): HttpConnectorParamsResult => {
  if ('url' in subActionParams) {
    return {
      errorMessage:
        "'url' cannot be set from the sandbox. The base URL and credentials are configured " +
        "on the connector in Kibana; use 'path' to address an endpoint under it.",
    };
  }

  const explicitMethod = subActionParams.method;
  const rawMethod = typeof explicitMethod === 'string' ? explicitMethod : subAction;
  const method = String(rawMethod ?? '').toUpperCase();

  if (!ALLOWED_METHODS.includes(method)) {
    return {
      errorMessage:
        `'${rawMethod}' is not a valid HTTP method. Pass the verb as the sub-action, e.g. ` +
        `--sub-action GET. Expected one of: ${ALLOWED_METHODS.join(', ')}.`,
    };
  }

  const params: Record<string, unknown> = { method };
  for (const key of FORWARDED_PARAMS) {
    if (subActionParams[key] !== undefined) {
      params[key] = subActionParams[key];
    }
  }

  return { params };
};

export const renderHttpConnectorSection = (name: string, id: string): string =>
  `## ${name} (connector-id: ${id}, type: ${HTTP_CONNECTOR_TYPE_ID})

Generic HTTP client. The base URL and any credentials live on the connector in Kibana and
are never exposed here — you address endpoints relative to that base URL.

Pass the HTTP verb as the sub-action. Params: \`path\`, \`query\`, \`headers\`, \`body\`, \`form_data\`.
Setting \`url\` is rejected.

\`\`\`bash
sandbox-cb --connector-id ${id} --sub-action GET --sub-action-params '{"path":"/json"}'
\`\`\`

Returns \`{"status":<code>,"statusText":...,"headers":{...},"data":<response body>}\`.`;
