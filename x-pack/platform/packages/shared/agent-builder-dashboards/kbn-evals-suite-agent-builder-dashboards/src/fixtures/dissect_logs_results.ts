/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SAMPLE_LOGS_INDEX } from './sample_logs_fields';

/**
 * Attachment type Discover registers for "AI Agent" over ES|QL results
 * (`src/platform/plugins/shared/discover/common/agent_builder.ts`). Declared
 * here because a package cannot import from a plugin.
 */
export const ESQL_QUERY_RESULTS_ATTACHMENT_TYPE = 'esql.query_results';

/** Payload Discover's `buildEsqlResultsAttachment` sends, validated server-side by the same schema. */
export interface EsqlQueryResultsData {
  query: string;
  columns: Array<{ name: string; type: string }>;
  sampleRows: Array<Record<string, unknown>>;
  totalHits: number;
  timeRange?: { from: string; to: string };
  [key: string]: unknown;
}

/**
 * Columns the query below creates with `DISSECT`. None of them is mapped on
 * the index, and none clashes with a mapped field (`response`, `request`,
 * `bytes`, `clientip`), so a control on any of them is a broken dropdown.
 */
export const DISSECT_DERIVED_COLUMNS: readonly string[] = [
  'client_ip',
  'http_method',
  'path',
  'http_version',
  'status_code',
  'response_bytes',
  'user_agent',
];

/** The query from elastic/kibana#294133: raw access-log lines parsed with `DISSECT`. */
export const DISSECT_LOGS_QUERY = `FROM ${SAMPLE_LOGS_INDEX}
| DISSECT message """%{client_ip} - - [%{log_timestamp}] "%{http_method} %{path} %{http_version}" %{status_code} %{response_bytes} "%{referrer}" "%{user_agent}\""""
| KEEP ${DISSECT_DERIVED_COLUMNS.join(', ')}`;

const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0a1) Gecko/20110421 Firefox/6.0a1';

const row = (
  clientIp: string,
  path: string,
  statusCode: string,
  responseBytes: string,
  userAgent: string
): Record<string, unknown> => ({
  client_ip: clientIp,
  http_method: 'GET',
  path,
  http_version: 'HTTP/1.1',
  status_code: statusCode,
  response_bytes: responseBytes,
  user_agent: userAgent,
});

/**
 * What Discover attaches after running {@link DISSECT_LOGS_QUERY} over the
 * sample web logs: the query, its keyword columns (`DISSECT` only produces
 * keywords), a few real rows, and the hit count.
 */
export const DISSECT_LOGS_RESULTS: EsqlQueryResultsData = {
  query: DISSECT_LOGS_QUERY,
  columns: DISSECT_DERIVED_COLUMNS.map((name) => ({ name, type: 'keyword' })),
  sampleRows: [
    row('223.87.60.27', '/elasticsearch/elasticsearch-6.3.2.deb_1', '200', '6219', FIREFOX),
    row('130.246.123.197', '/beats/metricbeat_1', '200', '6850', FIREFOX),
    row(
      '120.49.143.213',
      '/styles/main.css_1',
      '503',
      '0',
      'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24'
    ),
    row(
      '99.74.118.237',
      '/beats/metricbeat/metricbeat-6.3.2-amd64.deb_1',
      '200',
      '14113',
      'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)'
    ),
  ],
  totalHits: 14074,
  timeRange: { from: 'now-7d', to: 'now' },
};
