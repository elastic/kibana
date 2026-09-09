/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ground truth labels for the semantic log search discovery corpus.
 *
 * The corpus is generated deterministically with:
 *   node scripts/synthtrace sigevents \
 *     --target=http://elastic:changeme@localhost:9200 \
 *     --kibana=http://elastic:changeme@localhost:5620 \
 *     --scenarioOpts="scenario=postgres_timeout,seed=42" \
 *     --from=now-2h --to=now --clean
 *
 * Labels are applied by substring match against the raw `message` field, so they
 * survive re-generation as long as the seed and scenario stay the same.
 */

/**
 * Messages that genuinely report a connectivity / reachability failure.
 * Verified present in the corpus by audit task (648 documents in total).
 * Only the first four contain the token "connection"; the rest are reachable
 * only by meaning.
 */
export const CONNECTION_FAILURE = [
  'remaining connection slots are reserved',
  'could not connect to the server: Connection refused',
  'Connection pool exhausted',
  'outbound connection refused',
  'unable to reach Kafka broker',
  'Bad gateway calling policy-lookup',
  'PolicyLookupService/Lookup UNAVAILABLE',
  'No live ISR replicas for partition',
  'Error connecting to host',
  'upstream returned error',
];

/**
 * Lexical traps: contain "connection" / "pool" but describe healthy or
 * merely-degraded state. A purely lexical search ranks these highly.
 */
export const CONNECTION_HEALTHY = [
  'connection received: host=',
  'ConnectionPool stats:',
  '"msg":"pool stats"',
  'msg="connection pool snapshot"',
  'app.pool  Connection pool: active=',
  'Ready to accept connections tcp',
];

export const CONNECTION_WARNING = [
  '"msg":"pool nearing capacity"',
  'Pool nearing capacity: active=',
  'connection pool at 90% capacity',
  '"msg":"pg pool approaching limit"',
  'msg="pgx: connection pool approaching limit"',
];

/**
 * Slow / saturation problems that are not connectivity failures.
 */
export const DB_SLOWNESS = [
  'still waiting for ShareLock on transaction',
  'duration: 8435 ms  statement',
  '"msg":"Slow query"',
];

export interface EvalQuery {
  id: string;
  kind: 'semantic' | 'literal';
  query: string;
  relevant: string[];
  hardNegatives: string[];
  note: string;
}

export const EVAL_QUERIES: EvalQuery[] = [
  {
    id: 'connection_failures',
    kind: 'semantic',
    query: 'connection failures',
    relevant: CONNECTION_FAILURE,
    hardNegatives: CONNECTION_HEALTHY,
    note: 'Core case from the Slack thread. Requires matching messages that never use the word "connection".',
  },
  {
    id: 'cannot_reach_dependency',
    kind: 'semantic',
    query: 'a service cannot reach one of its dependencies',
    relevant: CONNECTION_FAILURE,
    hardNegatives: CONNECTION_HEALTHY,
    note: 'Paraphrase with no vocabulary overlap with the log lines.',
  },
  {
    id: 'database_slow',
    kind: 'semantic',
    query: 'the database is responding slowly',
    relevant: DB_SLOWNESS,
    hardNegatives: CONNECTION_FAILURE,
    note: 'Must distinguish slowness from connectivity failure.',
  },
  {
    id: 'literal_econnrefused',
    kind: 'literal',
    query: 'ECONNREFUSED',
    relevant: ['outbound connection refused'],
    hardNegatives: [],
    note: 'Literal token search must not regress.',
  },
  {
    id: 'literal_hikari',
    kind: 'literal',
    query: 'HikariPool',
    relevant: ['Connection pool exhausted', 'connection pool at 90% capacity'],
    hardNegatives: [],
    note: 'Literal class-name search must not regress.',
  },
];

/**
 * Check if a message matches any of the given patterns.
 */
export function matchesPattern(message: string, patterns: string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}
