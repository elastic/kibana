/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Read-only ES|QL against the QA overview cluster (QAF project telemetry). Credentials come
 * from env (O11Y_KIBANA_QA_URL / O11Y_KIBANA_QA_API_KEY, e.g. sourced from
 * kibana-operational-skills/.env) and are never logged. `now` is unsupported there: callers
 * pass fixed ISO timestamps.
 */

export interface EsqlResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

export const overviewEsql = async (query: string): Promise<EsqlResult> => {
  const url = process.env.O11Y_KIBANA_QA_URL;
  const key = process.env.O11Y_KIBANA_QA_API_KEY;
  if (!url || !key) throw new Error('O11Y_KIBANA_QA_URL / O11Y_KIBANA_QA_API_KEY not set');
  const res = await fetch(`${url.replace(/\/$/, '')}/internal/search/esql`, {
    method: 'POST',
    headers: {
      authorization: `ApiKey ${key}`,
      'kbn-xsrf': 'workload-isolation-research',
      'elastic-api-version': '1',
      'x-elastic-internal-origin': 'Kibana',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ params: { query } }),
    signal: AbortSignal.timeout(120000),
  });
  const text = await res.text();
  if (res.status !== 200) throw new Error(`overview esql ${res.status}: ${text.slice(0, 500)}`);
  const body = JSON.parse(text);
  const raw = body.rawResponse ?? body;
  return { columns: raw.columns ?? [], values: raw.values ?? [] };
};

/** Queries used to check that a QAF project's Kibana telemetry reaches the QA overview. */
export const overviewChecks = (
  projectId: string,
  fromIso: string,
  toIso: string
): Record<string, string> => {
  const window = `@timestamp >= "${fromIso}" AND @timestamp <= "${toIso}"`;
  return {
    kibana_logs_by_logger: `FROM serverless-logging-*:logs-kibana*
| WHERE ${window} AND serverless.project.id == "${projectId}"
| STATS n = COUNT(*) BY log.logger, log.level
| SORT n DESC | LIMIT 30`,
    research_plugin_logs: `FROM serverless-logging-*:logs-kibana*
| WHERE ${window} AND serverless.project.id == "${projectId}" AND log.logger LIKE "*workloadIsolationResearch*"
| KEEP @timestamp, log.level, message | LIMIT 50`,
    event_loop_warnings: `FROM serverless-logging-*:logs-kibana*
| WHERE ${window} AND serverless.project.id == "${projectId}" AND (message LIKE "*Event loop utilization*" OR message LIKE "*event loop*")
| KEEP @timestamp, log.logger, message | LIMIT 50`,
  };
};
