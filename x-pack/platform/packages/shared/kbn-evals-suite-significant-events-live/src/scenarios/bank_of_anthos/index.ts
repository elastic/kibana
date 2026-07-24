/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BANK_OF_ANTHOS_GCS_BASE_PATH_PREFIX,
  BANK_OF_ANTHOS_NAMESPACE,
  BENIGN_AUTH_DISCOVERY,
  GCS_BUCKET,
  LEDGER_DB_CASCADE_DISCOVERY,
} from '@kbn/evals-suite-significant-events';
import type { ReplayDataset, ReplayScenario } from '../types';
import {
  BENIGN_AUTH_RULE_UUIDS,
  CASCADE_RULE_UUIDS,
  canonicalRuleQueries,
} from './canonical_queries';

/**
 * Full-replay scenarios: replayed logs -> seeded canonical KI queries -> synthesized
 * `.rule-events` signals -> real detection workflow -> discovery agent -> triage workflow ->
 * significant events. The incident scenario checks recall (the cascade must surface as an open
 * event); the healthy baseline checks precision (no open events may be raised).
 */
const scenarios: ReplayScenario[] = [
  {
    input: {
      scenario_id: 'ledger-db-disconnect',
      stream_name: 'logs',
    },
    canonical_queries: canonicalRuleQueries,
    live: {
      // The captured snapshots are SHORT: ~3 minutes of healthy traffic followed by ~5 minutes
      // of failure (see BASELINE_WAIT_MS / FAILURE_WAIT_MS in the capture scripts), for a total
      // span of roughly 15-18 minutes. The offset must leave real baseline data before the cut,
      // and max_tail_minutes must be >= the offset or the END of the snapshot — where the
      // incident lives — gets silently dropped from the stream.
      incident_onset_offset_minutes: 8,
      max_tail_minutes: 8,
      criteria: [
        {
          id: 'live-generated-query-coverage',
          text: 'The LLM-generated rule-backed queries include proactive error detection that covers the ledger database failure signatures observable in the logs (JDBC/SQL connection errors such as SQLState 08001, cache errors, connection-refused failures from the frontend), so the incident is detectable when it occurs.',
          score: 3,
        },
        {
          id: 'live-open-cascade-event',
          text: 'The pipeline ends with at least one significant event with status=open that describes the ledger database connectivity failure and its user-visible impact (balances, transaction history, payments, deposits), grounded in observed error signatures rather than generic phrasing.',
          score: 3,
        },
        {
          id: 'live-benign-not-open',
          text: 'Healthy-traffic volume changes (successful logins, account creations, normal transaction throughput) do NOT end the run as open significant events — they are either never detected, never promoted, or dismissed.',
          score: 2,
        },
        {
          id: 'live-cascade-grouped',
          text: 'Database-failure signals are correlated into a single cascading incident rather than surfaced as many disconnected per-service events.',
          score: 2,
        },
      ],
    },
    output: {
      expected_detection_rule_uuids: CASCADE_RULE_UUIDS,
      allowed_detection_rule_uuids: BENIGN_AUTH_RULE_UUIDS,
      expected_discoveries: [LEDGER_DB_CASCADE_DISCOVERY, BENIGN_AUTH_DISCOVERY],
      expected_events: [
        { rule_uuids: CASCADE_RULE_UUIDS, statuses: ['open'] },
        { rule_uuids: BENIGN_AUTH_RULE_UUIDS, statuses: ['dismissed'] },
      ],
      expected_ground_truth:
        'detections=[7 cascade rules + up to 2 benign auth rules]; ' +
        'discoveries=[ledger-db-cascade, benign-auth]; ' +
        'events=[cascade=open/critical, benign-auth=dismissed]',
      criteria: [
        {
          id: 'replay-open-cascade-event',
          text: 'The pipeline ends with at least one significant event with status=open that describes the ledger database connectivity failure and its user-visible impact (balances, transaction history, payments, deposits), grounded in the observed error signatures (SQLState 08001, cache errors, connection failures).',
          score: 3,
        },
        {
          id: 'replay-benign-auth-not-open',
          text: 'The benign authentication volume increase (successful logins and account creations, no failures) does NOT end the run as an open significant event — it is either dismissed or never promoted.',
          score: 3,
        },
        {
          id: 'replay-cascade-grouped',
          text: 'The database-failure detections (SQL connection errors, cache errors, frontend/ledgerwriter connection failures) are correlated into a single cascading incident rather than surfaced as many per-service events.',
          score: 2,
        },
      ],
    },
    metadata: { difficulty: 'hard', failure_domain: 'ledger-db', failure_mode: 'cascade' },
  },
  {
    input: {
      scenario_id: 'healthy-baseline',
      stream_name: 'logs',
    },
    canonical_queries: canonicalRuleQueries,
    live: {
      // No incident: the tail is simply the last stretch of healthy traffic, streamed so the
      // generated rules run against live data — the false-positive check for the whole funnel.
      // The healthy-baseline snapshot spans ~13 minutes; keep most of it as onboarding baseline.
      incident_onset_offset_minutes: 5,
      max_tail_minutes: 5,
      criteria: [
        {
          id: 'live-baseline-no-open-events',
          text: 'No significant event ends the run with status=open — healthy banking traffic must not raise an incident.',
          score: 3,
        },
        {
          id: 'live-baseline-monitoring-queries',
          text: 'The LLM-generated queries set up sensible monitoring for the banking services (operational health plus proactive error detection), even though the traffic is healthy.',
          score: 2,
        },
        {
          id: 'live-baseline-benign-dismissed',
          text: 'If any detection or discovery was produced from healthy-traffic volume changes, it is dismissed as non-actionable rather than promoted to an open event.',
          score: 2,
        },
      ],
    },
    output: {
      // Error queries match nothing in healthy traffic; only the benign volume rules may fire
      // (the replay boundary reads as a step in their signal series), and nothing may reach an
      // open significant event.
      expected_detection_rule_uuids: [],
      allowed_detection_rule_uuids: BENIGN_AUTH_RULE_UUIDS,
      expected_events: [],
      expect_no_open_events: true,
      expected_ground_truth:
        'detections=[none required; benign auth volume rules tolerated]; events=[no open events]',
      criteria: [
        {
          id: 'replay-baseline-no-open-events',
          text: 'No significant event ends the run with status=open — healthy banking traffic must not raise an incident.',
          score: 3,
        },
        {
          id: 'replay-baseline-benign-dismissed',
          text: 'If any discovery was produced from healthy-traffic volume changes (successful logins, account creations), it is dismissed as non-actionable rather than promoted.',
          score: 2,
        },
      ],
    },
    metadata: { difficulty: 'medium', failure_domain: 'none' },
  },
];

export const bankOfAnthosReplayDataset: ReplayDataset = {
  id: BANK_OF_ANTHOS_NAMESPACE,
  gcs: { bucket: GCS_BUCKET, basePathPrefix: BANK_OF_ANTHOS_GCS_BASE_PATH_PREFIX },
  scenarios,
};
