/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  getBreachEsqlQuery,
  getNoDataEsqlQuery,
  getRecoverEsqlQuery,
  type CreateRuleData,
} from '@kbn/alerting-v2-schemas';

/** Index the diagnosis rules read. It exists and is readable by the eval user. */
export const DIAGNOSIS_WEB_INDEX = 'alerting-v2-eval-diagnosis-web';

/** A wildcard pattern that matches no index. */
export const DIAGNOSIS_NO_MATCH_PATTERN = 'alerting-v2-eval-diagnosis-web-prod-*';

/** A concrete index name that no longer exists (for example rolled over or deleted). */
export const DIAGNOSIS_MISSING_LITERAL_INDEX = 'alerting-v2-eval-diagnosis-web-2026.01.01';

export const DIAGNOSIS_RULE_OWNER = 'alerting_eval_owner';

const DIAGNOSIS_WEB_MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' },
    host: { properties: { name: { type: 'keyword' } } },
    service: { properties: { name: { type: 'keyword' } } },
    url: { properties: { original: { type: 'keyword' } } },
    http: {
      properties: {
        response: {
          properties: {
            status_code: { type: 'long' },
            bytes: { type: 'long' },
          },
        },
      },
    },
    message: { type: 'text' },
  },
} as const;

const DIAGNOSIS_WEB_DOC_COUNT = 20;

export const installDiagnosisData = async (esClient: Client, log: ToolingLog): Promise<void> => {
  await esClient.indices.create({
    index: DIAGNOSIS_WEB_INDEX,
    mappings: DIAGNOSIS_WEB_MAPPINGS,
  });
  const now = Date.now();
  const operations = Array.from({ length: DIAGNOSIS_WEB_DOC_COUNT }, (_, i) => [
    { index: { _index: DIAGNOSIS_WEB_INDEX } },
    {
      '@timestamp': new Date(now - i * 30_000).toISOString(),
      host: { name: `web-${i % 3}` },
      service: { name: i % 2 === 0 ? 'checkout' : 'cart' },
      url: { original: `/api/items/${i}` },
      http: { response: { status_code: i % 4 === 0 ? 503 : 200, bytes: 512 + i } },
      message: `GET /api/items/${i}`,
    },
  ]).flat();
  await esClient.bulk({ operations, refresh: 'wait_for' });
  log.info(`Created diagnosis eval index ${DIAGNOSIS_WEB_INDEX}`);
};

export const removeDiagnosisData = async (esClient: Client, log: ToolingLog): Promise<void> => {
  await esClient.indices.delete({ index: DIAGNOSIS_WEB_INDEX, ignore_unavailable: true });
  log.info(`Deleted diagnosis eval index ${DIAGNOSIS_WEB_INDEX}`);
};

/** One failed rule execution: the saved rule and the error message its run recorded. */
export interface FailureScenario {
  rule: CreateRuleData;
  error: string;
  durationMs?: number;
}

const BASE_RULE = {
  kind: 'alert',
  schedule: { every: '5m', lookback: '5m' },
  time_field: '@timestamp',
  recovery: { strategy: 'no_breach' },
  no_data: { strategy: 'ignore' },
  state_transition: { pending: { count: 0 }, recovering: { count: 0 } },
} as const;

const ERRORS_BY_HOST = `FROM ${DIAGNOSIS_WEB_INDEX} | WHERE http.response.status_code >= 500 | STATS server_errors = COUNT(*) BY host.name`;

const rule = (
  name: string,
  overrides: Omit<Partial<CreateRuleData>, 'metadata'> & Pick<CreateRuleData, 'query'>
): CreateRuleData => ({
  ...BASE_RULE,
  grouping: { fields: ['host.name'] },
  ...overrides,
  metadata: { name },
});

/** `line L:C` of the first occurrence of `token` in an ES|QL query, as ES reports it. */
export const esqlPosition = (query: string, token: string): string => {
  const offset = query.indexOf(token);
  if (offset < 0) {
    throw new Error(`Token [${token}] not found in query: ${query}`);
  }
  const lines = query.slice(0, offset).split('\n');
  return `line ${lines.length}:${lines[lines.length - 1].length + 1}`;
};

const verificationProblem = (query: string, token: string, problem: string): string =>
  [
    'verification_exception',
    '\tRoot causes:',
    '\t\tverification_exception: Found 1 problem',
    `${esqlPosition(query, token)}: ${problem}`,
  ].join('\n');

const verificationError = (message: string): string =>
  ['verification_exception', '\tRoot causes:', `\t\tverification_exception: ${message}`].join('\n');

const breachQueryOf = (data: CreateRuleData): string => getBreachEsqlQuery(data.query);

const recoveryQueryOf = (data: CreateRuleData): string => {
  const query = getRecoverEsqlQuery(data.query, data.recovery);
  if (query === undefined) {
    throw new Error(`Rule [${data.metadata.name}] has no recovery query`);
  }
  return query;
};

const noDataQueryOf = (data: CreateRuleData): string => {
  const query = getNoDataEsqlQuery(data.query, data.no_data);
  if (query === undefined) {
    throw new Error(`Rule [${data.metadata.name}] has no no-data query`);
  }
  return query;
};

const scenario = (
  data: CreateRuleData,
  buildError: (data: CreateRuleData) => string,
  durationMs?: number
): FailureScenario => ({ rule: data, error: buildError(data), durationMs });

/** Failure types the skill lists (datasets 1 to 5 in the eval plan). */
export const COVERED_FAILURE_SCENARIOS = {
  breachSegmentTypo: scenario(
    rule('Eval diagnosis: server errors per host', {
      query: { base: ERRORS_BY_HOST, breach: { segment: 'WHERE server_error > 10' } },
    }),
    (data) =>
      verificationProblem(
        breachQueryOf(data),
        'server_error >',
        'Unknown column [server_error], did you mean [server_errors]?'
      )
  ),
  wildcardNoIndex: scenario(
    rule('Eval diagnosis: production request volume', {
      query: {
        base: `FROM ${DIAGNOSIS_NO_MATCH_PATTERN} | STATS requests = COUNT(*) BY host.name | WHERE requests > 1000`,
      },
    }),
    (data) => verificationProblem(breachQueryOf(data), 'host.name', 'Unknown column [host.name]')
  ),
  missingLiteralIndex: scenario(
    rule('Eval diagnosis: daily index errors', {
      query: {
        base: `FROM ${DIAGNOSIS_MISSING_LITERAL_INDEX} | WHERE http.response.status_code >= 500 | STATS server_errors = COUNT(*) BY host.name | WHERE server_errors > 10`,
      },
    }),
    () => verificationError(`Unknown index [${DIAGNOSIS_MISSING_LITERAL_INDEX}]`)
  ),
  typeMismatch: scenario(
    rule('Eval diagnosis: busy hosts', {
      query: {
        base: `FROM ${DIAGNOSIS_WEB_INDEX} | WHERE host.name > 5 | STATS requests = COUNT(*) BY host.name | WHERE requests > 100`,
      },
    }),
    (data) =>
      verificationProblem(
        breachQueryOf(data),
        'host.name > 5',
        'first argument of [host.name > 5] is [keyword] so second argument must also be [keyword] but was [integer]'
      )
  ),
  droppedColumn: scenario(
    rule('Eval diagnosis: failing requests per host', {
      query: {
        base: `FROM ${DIAGNOSIS_WEB_INDEX} | STATS requests = COUNT(*) BY host.name`,
        breach: { segment: 'WHERE http.response.status_code >= 500' },
      },
    }),
    (data) =>
      verificationProblem(
        breachQueryOf(data),
        'http.response.status_code',
        'Unknown column [http.response.status_code]'
      )
  ),
  recoveryQuery: scenario(
    rule('Eval diagnosis: server errors with recovery query', {
      query: { base: ERRORS_BY_HOST, breach: { segment: 'WHERE server_errors > 10' } },
      recovery: {
        strategy: 'query',
        query: `FROM ${DIAGNOSIS_WEB_INDEX} | WHERE http.status >= 500 | STATS server_errors = COUNT(*) BY host.name | WHERE server_errors < 5`,
      },
    }),
    (data) =>
      verificationProblem(recoveryQueryOf(data), 'http.status', 'Unknown column [http.status]')
  ),
  noDataQuery: scenario(
    rule('Eval diagnosis: server errors with heartbeat check', {
      query: { base: ERRORS_BY_HOST, breach: { segment: 'WHERE server_errors > 10' } },
      no_data: {
        strategy: 'keep_last',
        query: 'FROM alerting-v2-eval-diagnosis-heartbeat-* | STATS beats = COUNT(*) BY host.name',
      },
    }),
    (data) => verificationProblem(noDataQueryOf(data), 'host.name', 'Unknown column [host.name]')
  ),
  ownerWithoutRead: scenario(
    rule('Eval diagnosis: checkout errors', {
      query: {
        base: `FROM ${DIAGNOSIS_WEB_INDEX} | WHERE service.name == "checkout" AND http.response.status_code >= 500 | STATS server_errors = COUNT(*) BY host.name | WHERE server_errors > 10`,
      },
    }),
    () => verificationError(`Unknown index [${DIAGNOSIS_WEB_INDEX}]`)
  ),
  securityException: scenario(
    rule('Eval diagnosis: cart errors', {
      query: {
        base: `FROM ${DIAGNOSIS_WEB_INDEX} | WHERE service.name == "cart" AND http.response.status_code >= 500 | STATS server_errors = COUNT(*) BY host.name | WHERE server_errors > 10`,
      },
    }),
    () =>
      [
        'security_exception',
        '\tRoot causes:',
        `\t\tsecurity_exception: action [indices:data/read/esql] is unauthorized for user [${DIAGNOSIS_RULE_OWNER}] with effective roles [alerting_eval_viewer] on indices [${DIAGNOSIS_WEB_INDEX}], this action is granted by the index privileges [read,all]`,
      ].join('\n')
  ),
  oversizedResponse: scenario(
    rule('Eval diagnosis: raw server error events', {
      query: { base: `FROM ${DIAGNOSIS_WEB_INDEX} | WHERE http.response.status_code >= 500` },
      grouping: undefined,
    }),
    () =>
      'ES|QL query response exceeded the maximum allowed size of 10mb. Narrow the query with KEEP so it returns only the fields the alert needs, drop wide fields, or aggregate with STATS.'
  ),
  timeout: scenario(
    rule('Eval diagnosis: distinct urls per request', {
      schedule: { every: '1m', lookback: '30d' },
      query: {
        base: `FROM ${DIAGNOSIS_WEB_INDEX} | STATS urls = COUNT_DISTINCT(url.original) BY @timestamp, host.name | WHERE urls > 100`,
      },
      grouping: { fields: ['@timestamp', 'host.name'] },
    }),
    () => 'Rule execution aborted',
    60_000
  ),
  platformError: scenario(
    rule('Eval diagnosis: service errors', {
      query: {
        base: `FROM ${DIAGNOSIS_WEB_INDEX} | WHERE http.response.status_code >= 500 | STATS server_errors = COUNT(*) BY host.name | WHERE server_errors > 10`,
      },
    }),
    () =>
      [
        'cluster_block_exception',
        '\tRoot causes:',
        '\t\tcluster_block_exception: index [.ds-.rule-events-2026.11.10-000001] blocked by: [TOO_MANY_REQUESTS/12/disk usage exceeded flood-stage watermark, index has read-only-allow-delete block; for more information, see https://ela.st/es-req-flood-stage-watermark];',
      ].join('\n')
  ),
} as const;

/** Failures the skill does not list (dataset 6), each verified as a real run-time failure. */
export const UNLISTED_FAILURE_SCENARIOS = {
  missingEnrichPolicy: scenario(
    rule('Eval diagnosis: server errors per owner', {
      query: {
        base: `FROM ${DIAGNOSIS_WEB_INDEX} | ENRICH host_owners ON host.name | WHERE http.response.status_code >= 500 | STATS server_errors = COUNT(*) BY host.name | WHERE server_errors > 10`,
      },
    }),
    (data) =>
      verificationProblem(breachQueryOf(data), 'ENRICH', 'cannot find enrich policy [host_owners]')
  ),
  lookupJoinStandardIndex: scenario(
    rule('Eval diagnosis: server errors joined with hosts', {
      query: {
        base: `FROM ${DIAGNOSIS_WEB_INDEX} | LOOKUP JOIN ${DIAGNOSIS_WEB_INDEX} ON host.name | WHERE http.response.status_code >= 500 | STATS server_errors = COUNT(*) BY host.name | WHERE server_errors > 10`,
      },
    }),
    () =>
      verificationError(
        `Lookup Join requires a single lookup mode index; [${DIAGNOSIS_WEB_INDEX}] resolves to [${DIAGNOSIS_WEB_INDEX}] in [standard] mode in local cluster`
      )
  ),
  noSuchRemoteCluster: scenario(
    rule('Eval diagnosis: edge server errors', {
      query: {
        base: `FROM edge:${DIAGNOSIS_WEB_INDEX} | WHERE http.response.status_code >= 500 | STATS server_errors = COUNT(*) BY host.name | WHERE server_errors > 10`,
      },
    }),
    () =>
      [
        'no_such_remote_cluster_exception',
        '\tRoot causes:',
        '\t\tno_such_remote_cluster_exception: no such remote cluster: [edge]',
      ].join('\n')
  ),
  unknownFunction: scenario(
    rule('Eval diagnosis: response size p95', {
      query: {
        base: `FROM ${DIAGNOSIS_WEB_INDEX} | STATS p95_bytes = PERCENT(http.response.bytes, 95) BY host.name | WHERE p95_bytes > 100000`,
      },
    }),
    (data) =>
      verificationProblem(
        breachQueryOf(data),
        'PERCENT(',
        'Unknown function [PERCENT], did you mean any of [percentile, present, mv_percentile]?'
      )
  ),
  numericTimeField: scenario(
    rule('Eval diagnosis: response bytes per host', {
      time_field: 'http.response.bytes',
      query: {
        base: `FROM ${DIAGNOSIS_WEB_INDEX} | STATS total_bytes = SUM(http.response.bytes) BY host.name | WHERE total_bytes > 1000000`,
      },
    }),
    () =>
      [
        'query_shard_exception',
        '\tCaused by:',
        '\t\tnumber_format_exception: For input string: "2026-11-11T21:09:59.132Z"',
        '\tRoot causes:',
        '\t\tquery_shard_exception: failed to create query: For input string: "2026-11-11T21:09:59.132Z"',
      ].join('\n')
  ),
} as const;

export const FAILURE_SCENARIOS = {
  ...COVERED_FAILURE_SCENARIOS,
  ...UNLISTED_FAILURE_SCENARIOS,
} as const;

export type FailureScenarioKey = keyof typeof FAILURE_SCENARIOS;

export const isFailureScenarioKey = (key: string): key is FailureScenarioKey =>
  Object.hasOwn(FAILURE_SCENARIOS, key);
