/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_DATA_SOURCE_NAME_LENGTH = 100;
export const MAX_DATA_SOURCE_INSTANCE_LENGTH = 200;
export const MAX_DATA_SOURCE_QUERY_LENGTH = 4_000;
export const MAX_DATA_SOURCE_PAYLOAD_LENGTH = 4_000;
export const MAX_DATA_SOURCE_ENDPOINT_LENGTH = 2_048;

/** Where the data behind an event came from, and how it was asked for. */
export interface ImpactMapDataSource {
  /** The system, for example Elasticsearch or Grafana. */
  name: string;
  /** Which one: this project's own cluster, or another cluster, project or host by name. */
  instance?: string;
  query?: { language?: string; text: string };
  api_call?: { method?: string; type?: string; endpoint?: string; payload?: string };
}

const HIDDEN = '[hidden]';

// A header or field that carries a credential, in JSON (`"authorization": "..."`) or a
// header/curl style (`Authorization: ...`, `-u user:pass`).
const SECRET_NAME =
  '(?:authorization|proxy-authorization|x-api-key|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|token|password|passwd|secret|client[_-]?secret|cookie|set-cookie)';
const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [new RegExp(`("${SECRET_NAME}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`, 'gi'), `$1"${HIDDEN}"`],
  [
    new RegExp(`(\\b${SECRET_NAME}\\s*[:=]\\s*)[^\\s,;&"']+(?:\\s+[^\\s,;&"']+)?`, 'gi'),
    `$1${HIDDEN}`,
  ],
  [/\b(Bearer|ApiKey|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g, `$1 ${HIDDEN}`],
  [/(\s-u\s+)\S+/g, `$1${HIDDEN}`],
];

/** The text with credentials replaced, so a stored query or call never carries one. */
export const redactSecrets = (text: string): string =>
  SECRET_PATTERNS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max) : text);

/** The data source with every field clipped to its limit and credentials hidden. */
export const sanitizeDataSource = (source: ImpactMapDataSource): ImpactMapDataSource => {
  const { name, query, api_call: call } = source;
  return {
    name: clip(name.trim(), MAX_DATA_SOURCE_NAME_LENGTH),
    ...(source.instance?.trim()
      ? { instance: clip(redactSecrets(source.instance.trim()), MAX_DATA_SOURCE_INSTANCE_LENGTH) }
      : {}),
    ...(query?.text.trim()
      ? {
          query: {
            ...(query.language ? { language: clip(query.language, 40) } : {}),
            text: clip(redactSecrets(query.text), MAX_DATA_SOURCE_QUERY_LENGTH),
          },
        }
      : {}),
    ...(call
      ? {
          api_call: {
            ...(call.method ? { method: clip(call.method.toUpperCase(), 16) } : {}),
            ...(call.type ? { type: clip(call.type, 100) } : {}),
            ...(call.endpoint
              ? { endpoint: clip(redactSecrets(call.endpoint), MAX_DATA_SOURCE_ENDPOINT_LENGTH) }
              : {}),
            ...(call.payload
              ? { payload: clip(redactSecrets(call.payload), MAX_DATA_SOURCE_PAYLOAD_LENGTH) }
              : {}),
          },
        }
      : {}),
  };
};
