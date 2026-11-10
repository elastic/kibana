/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidDuration, parseDuration } from '@kbn/workflows';

export const DEFAULT_WAIT_MS = 5 * 60 * 1000;
export const MAX_WAIT_MS = 30 * 60 * 1000;

/**
 * A `wait_timeout` in milliseconds, in the format of the step-level `timeout` (`30s`, `5m`,
 * `1m30s`, `90000ms`); `undefined` when invalid or zero.
 */
export const parseWaitMs = (value: string | undefined): number | undefined => {
  if (value === undefined || !isValidDuration(value)) return undefined;
  const ms = parseDuration(value);

  return ms > 0 ? ms : undefined;
};

/** True for a duration above zero and up to {@link MAX_WAIT_MS}. */
export const isWithinMaxWait = (value: string): boolean => {
  const ms = parseWaitMs(value);

  return ms !== undefined && ms <= MAX_WAIT_MS;
};

export const DEFAULT_MAX_ROWS = 1000;
export const MAX_ROWS = 10000;

export const MAX_AGENT_IDS = 250;
export const MAX_AGENT_POLICY_IDS = 10;
/**
 * Policy ids go into the agents route's `kuery`, which is capped at 4096 characters. Each id is
 * written twice (exact and `#*` variant) and escaping can lengthen it, so ten ids of this length
 * stay under the cap and an over-long id is an `INVALID_INPUT`, not a rejected request.
 */
export const MAX_AGENT_POLICY_ID_LENGTH = 64;

/** Longest accepted `agent_ids` entry: the limit Fleet itself applies to agent ids. */
export const MAX_AGENT_ID_LENGTH = 512;
/** Post-expansion ceiling: the live-query route has no bound of its own. */
export const TARGET_AGENT_LIMIT = 1000;

/** The results route answers 400 `PAGINATION_LIMIT_EXCEEDED` at `page * pageSize >= 10000`. */
export const RESULTS_PAGE_SIZE = 200;
export const RESULTS_MAX_WINDOW = 10000;
/**
 * Most results reads (failed ones included) one poll makes. Nothing else bounds a poll in time, and
 * after failed reads the page size shrinks to 25, 5 or 1 rows, which would turn `max_rows: 10000`
 * into thousands of sequential calls. 450 lets the whole 10k window be read in 25-row pages (400
 * reads) with room for the failed reads. Past the cap the rows read so far are returned as a failed
 * read: the next poll starts again at the full page size.
 */
export const RESULTS_MAX_READS_PER_POLL = 450;
/**
 * Bytes of rows one run puts in its output. The engine fails a step whose output is larger than the
 * effective `max-step-size` (10MB by default, lower when the step, the workflow or `kibana.yml`
 * sets it), and a step cannot read that limit, so this stays under the default. A lower
 * `max-step-size` can still fail the step after the query was dispatched; the step description says
 * so.
 */
export const OUTPUT_BUDGET_BYTES = 8 * 1024 * 1024;

/**
 * Polls in a row, after every agent answered, that the searchable result count may stay below
 * the agent-reported row count before the rows are read anyway. Result documents can be lost
 * after the agent reported them; without a bound the step would wait out the whole deadline.
 */
export const RESULTS_SETTLE_POLLS = 3;
/**
 * Extra polls after the deadline when the status read itself fails, so one transient error on
 * the last poll is not reported as `timed_out`.
 */
export const DEADLINE_READ_GRACE_POLLS = 2;

export const POLL_POLICY = {
  strategy: 'exponential',
  initialMs: 5000,
  maxMs: 30000,
  jitter: true,
} as const;

/**
 * Both fields must always be set: `createPollServerStepDefinition` falls back to its defaults
 * for the whole object when either one is omitted.
 */
export const POLL_CEILINGS = { maxAttempts: 150, maxWaitMs: 30000 } as const;
