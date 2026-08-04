/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detection, SignificantEvent } from '@kbn/significant-events-schema';
import type { DatasetConfig } from '../types';

const toInputDetections = (
  discoveries: Array<Partial<SignificantEvent>>
): Array<Partial<Detection>> =>
  discoveries
    .flatMap((discovery) => discovery.signals ?? [])
    .map((signal) => ({
      detection_id: signal.metadata?.detection_id,
      rule_name: signal.metadata?.rule_name,
      rule_uuid: signal.metadata?.rule_uuid,
      stream_name: signal.stream_name,
      change_point_type: signal.metadata?.change_point_type ?? 'spike',
      p_value: signal.metadata?.p_value ?? 0.0001,
    }));

/**
 * Canonical cascade discovery — the lean ground truth shared by the discovery (expected output)
 * and the judge (input) agents. Evidences carry the `esql_query` to re-run but are deliberately NOT
 * pre-stamped `confirmed` — the judge must re-verify each query via execute_esql and stamp
 * `confirmed: true` itself before promoting (Critical Rule 5). Every field here is seeded by one of
 * the cascade `detections`, so the canonical input and this expected answer stay self-consistent.
 */
const LEDGER_DB_CASCADE_DISCOVERY: Partial<SignificantEvent> = {
  event_id: 'transactionhistory__frontend-transactionhistory-read-timeout',
  title: 'Ledger backends — customer transaction connectivity failure',
  symptom_hypothesis:
    'Customer transaction flows are failing because ledger database and cache dependencies refuse connections.',
  summary:
    'balancereader, transactionhistory, and ledgerwriter are all returning connection-refused errors to the frontend, with concurrent cache errors in balancereader/transactionhistory and a SQL connection failure (SQLState 08001) in transactionhistory. Users cannot view account balances, cannot view transaction history, and cannot submit payments or deposits. Onset ~14:30 UTC with no sign of recovery.',
  severity: '80-critical',
  confidence: 0.82,
  stream_names: ['logs'],
  signals: [
    {
      type: 'detection',
      stream_name: 'logs',
      confirmed: true,
      description:
        'Found: SQLState 08001 connection refused from transactionhistory. Impact: transaction-history reads blocked. Verdict: confirms.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "SQLState: 08001") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: 'db7de543-0f37-5db4-a0ff-c75c92f0eca1-det',
        rule_name: 'Transaction History Database SQL Connection Error',
        rule_uuid: 'db7de543-0f37-5db4-a0ff-c75c92f0eca1',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      stream_name: 'logs',
      confirmed: true,
      description:
        'Found: connection refused to transactionhistory:8080 on /transactions. Impact: users cannot view transaction history. Verdict: confirms.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error getting transaction_list") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '2cd4c371-f1c3-5c19-a115-1c03be31317e-det',
        rule_name: 'Frontend → Transaction History Connection Failures',
        rule_uuid: '2cd4c371-f1c3-5c19-a115-1c03be31317e',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      stream_name: 'logs',
      confirmed: true,
      description:
        'Found: connection refused to balancereader:8080 on /balances. Impact: users cannot view account balances. Verdict: confirms.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error getting balance") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a-det',
        rule_name: 'Frontend → Balance Reader Connection Failures',
        rule_uuid: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      stream_name: 'logs',
      confirmed: true,
      description:
        'Found: Cache error from transactionhistory and balancereader. Impact: balance and transaction-history lookups degraded. Verdict: confirms.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Cache error") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 2',
        result: 'found',
      },
      metadata: {
        detection_id: '159d6c01-9b26-5d7f-99c6-a3471e00d97e-det',
        rule_name: 'Cache Errors in Balance Reader or Transaction History',
        rule_uuid: '159d6c01-9b26-5d7f-99c6-a3471e00d97e',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      stream_name: 'logs',
      confirmed: true,
      description:
        'Found: Failed to retrieve account balance. Impact: payment and deposit submissions fail. Verdict: confirms.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Failed to retrieve account balance") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '0ae69b00-d0f3-5c57-971d-2470ad5b6459-det',
        rule_name: 'Ledger Writer Failed to Retrieve Account Balance',
        rule_uuid: '0ae69b00-d0f3-5c57-971d-2470ad5b6459',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      stream_name: 'logs',
      confirmed: true,
      description:
        'Found: connection refused to ledgerwriter:8080 on deposit /transactions. Impact: users cannot complete deposits. Verdict: confirms.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error submitting deposit") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '64f04c77-495a-58cb-beba-98108fcaa5dd-det',
        rule_name: 'Frontend → Ledger Writer Deposit Submission Error',
        rule_uuid: '64f04c77-495a-58cb-beba-98108fcaa5dd',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
    {
      type: 'detection',
      stream_name: 'logs',
      confirmed: true,
      description:
        'Found: connection refused to ledgerwriter:8080 on payment /transactions. Impact: users cannot complete payments. Verdict: confirms.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error submitting payment") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '431f1573-2ad6-5847-9602-283c63450d6b-det',
        rule_name: 'Frontend → Ledger Writer Payment Submission Error',
        rule_uuid: '431f1573-2ad6-5847-9602-283c63450d6b',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
  ],
  causal_features: [
    { feature_id: 'transactionhistory', name: 'transactionhistory', stream_name: 'logs' },
    { feature_id: 'balancereader', name: 'balancereader', stream_name: 'logs' },
    { feature_id: 'ledgerwriter', name: 'ledgerwriter', stream_name: 'logs' },
  ],
  blast_radius: [
    {
      type: 'dependency',
      feature_id: 'frontend-balancereader',
      source: 'frontend',
      target: 'balancereader',
      stream_name: 'logs',
    },
    {
      type: 'dependency',
      feature_id: 'frontend-transactionhistory',
      source: 'frontend',
      target: 'transactionhistory',
      stream_name: 'logs',
    },
    {
      type: 'dependency',
      feature_id: 'frontend-ledgerwriter',
      source: 'frontend',
      target: 'ledgerwriter',
      stream_name: 'logs',
    },
    {
      type: 'dependency',
      feature_id: 'ledgerwriter-balancereader',
      source: 'ledgerwriter',
      target: 'balancereader',
      stream_name: 'logs',
    },
    {
      type: 'dependency',
      feature_id: 'ledgerwriter-postgresql',
      source: 'ledgerwriter',
      target: 'postgresql',
      stream_name: 'logs',
    },
    {
      type: 'dependency',
      feature_id: 'transactionhistory-postgresql',
      source: 'transactionhistory',
      target: 'postgresql',
      stream_name: 'logs',
    },
  ],
};

const LEDGER_DB_CASCADE_RULE_UUIDS = (LEDGER_DB_CASCADE_DISCOVERY.signals ?? [])
  .map((signal) => signal.metadata?.rule_uuid)
  .filter((ruleUuid): ruleUuid is string => Boolean(ruleUuid));

/** Benign login spike — must stay a SEPARATE discovery from the failure cascade and from signup. */
const BENIGN_LOGIN_DISCOVERY: Partial<SignificantEvent> = {
  event_id: 'userservice__successful-user-login',
  title: 'Authentication — successful login volume increase',
  symptom_hypothesis: 'Successful login activity increased without an observed failure.',
  summary:
    'Successful login events increased around 14:30 UTC. All sampled events completed successfully, with no observed error signature or blocked user task.',
  severity: '20-low',
  confidence: 0.35,
  signals: [
    {
      type: 'detection',
      stream_name: 'logs',
      confirmed: true,
      description:
        'Found: successful login event, no error signature. Impact: none — volume spike only. Verdict: refutes.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Login Successful") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '0dfb4f2f-2060-5369-9d75-02287ea4e060-det',
        rule_name: 'Successful User Login',
        rule_uuid: '0dfb4f2f-2060-5369-9d75-02287ea4e060',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
  ],
  causal_features: [{ feature_id: 'userservice', name: 'userservice', stream_name: 'logs' }],
};

/** Benign signup spike — must stay a SEPARATE discovery from the failure cascade and from login. */
const BENIGN_SIGNUP_DISCOVERY: Partial<SignificantEvent> = {
  event_id: 'userservice__new-account-created',
  title: 'Authentication — new account creation volume increase',
  symptom_hypothesis: 'New account creation activity increased without an observed failure.',
  summary:
    'New account-creation events increased around 14:30 UTC. All sampled events completed successfully, with no observed error signature or blocked user task.',
  severity: '20-low',
  confidence: 0.35,
  signals: [
    {
      type: 'detection',
      stream_name: 'logs',
      confirmed: true,
      description:
        'Found: successful account creation, no error signature. Impact: none — volume spike only. Verdict: refutes.',
      evidence: {
        esql_query:
          'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Successfully created user") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
        result: 'found',
      },
      metadata: {
        detection_id: '334488fe-8405-5e30-b538-ba028b6b0961-det',
        rule_name: 'New User Account Created',
        rule_uuid: '334488fe-8405-5e30-b538-ba028b6b0961',
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    },
  ],
  causal_features: [{ feature_id: 'userservice', name: 'userservice', stream_name: 'logs' }],
};

const MISGROUPED_LEDGER_DISCOVERY: Partial<SignificantEvent> = {
  ...LEDGER_DB_CASCADE_DISCOVERY,
  event_id: 'ledger-db-disconnect__misgrouped-auth',
  signals: [
    ...(LEDGER_DB_CASCADE_DISCOVERY.signals ?? []),
    ...(BENIGN_LOGIN_DISCOVERY.signals ?? []),
    ...(BENIGN_SIGNUP_DISCOVERY.signals ?? []),
  ],
};

export const discovery: DatasetConfig['discovery'] = [
  {
    input: {
      scenario_id: 'ledger-db-disconnect',
      stream_name: 'logs',
      detections: toInputDetections([LEDGER_DB_CASCADE_DISCOVERY]),
    },
    // Ground-truth continuation chains (ordered, by readable `rule_name`) the continuation eval
    // replays one rule per cycle. Each chain legitimately continues ONE event, so the agent
    // should reuse a single event_id. `semantic` = same service + symptom, no rule_uuid overlap;
    // `cascade` = upstream → downstreams across services, linked by dependency topology.
    continuationChains: {
      semantic: [
        'Frontend → Ledger Writer Payment Submission Error',
        'Frontend → Ledger Writer Deposit Submission Error',
      ],
      cascade: [
        'Transaction History Database SQL Connection Error',
        'Frontend → Transaction History Connection Failures',
      ],
    },
    output: {
      expected_ground_truth:
        'discoveries=[ledger-db-cascade (transactionhistory/balancereader/ledgerwriter->postgresql SQLState 08001, cache errors, frontend connection-refused failures)]',
      expected_discoveries: [LEDGER_DB_CASCADE_DISCOVERY],
      criteria: [
        {
          id: 'symptom-hypothesis-sql-connection',
          text: 'States one sentence connecting every grouped detection through the transactionhistory↔postgresql SQL connection failure (SQLState 08001 / failed JDBC connections). Uses confirming rows where available and compatible exact-query KI context for sparse rows, without presenting KI context as proof of current activity. Does not introduce another endpoint or claim a final root cause.',
          score: 3,
        },
        {
          id: 'cascade-transactionhistory-cluster',
          text: 'Groups the SQL connection failure, the shared cache errors, and the frontend→transactionhistory connection failures into a single discovery (transactionhistory service cluster).',
          score: 1,
        },
        {
          id: 'cascade-full-grouping',
          text: 'Further collapses the frontend→balancereader connection failures and the ledgerwriter balance-retrieval, payment, and deposit failures into the same cascading discovery as the transactionhistory cluster — all seven detections linked by the evidence-backed postgresql/cache failure hypothesis rather than split into separate service-scoped discoveries.',
          score: 2,
        },
        {
          id: 'dependency-chain',
          text: 'Names the dependency from transactionhistory to postgresql and the downstream impact on the frontend read/write paths across balancereader and ledgerwriter.',
          score: 1,
        },
        {
          id: 'error-signatures',
          text: 'Cites observed error signatures (SQLState 08001, cache error, connection refused) rather than generic phrasing.',
          score: 1,
        },
        {
          id: 'objective-narrative',
          text: 'Uses a stable failure-domain title and an objective summary of observed state and potential impact, without recommendations, next actions, or urgency language.',
          score: 1,
        },
      ],
    },
    metadata: { difficulty: 'medium', failure_domain: 'ledger-db', failure_mode: 'cascade' },
  },
];

export const discoveryJudge: DatasetConfig['discoveryJudge'] = [
  {
    id: 'ledger-db-disconnect',
    input: {
      scenario_id: 'ledger-db-disconnect',
      discoveries: [LEDGER_DB_CASCADE_DISCOVERY, BENIGN_LOGIN_DISCOVERY, BENIGN_SIGNUP_DISCOVERY],
    },
    output: {
      expected_ground_truth:
        'cascade discovery (transactionhistory/balancereader/ledgerwriter → postgresql SQLState 08001, ' +
        'user-blocking connection-refused failures)=open/80-critical; ' +
        'benign login spike (successful logins only, no failures)=dismissed; ' +
        'benign signup spike (successful account creations only, no failures)=dismissed',
      expected_confirmed_rule_uuids: {
        'transactionhistory__frontend-transactionhistory-read-timeout':
          LEDGER_DB_CASCADE_RULE_UUIDS,
        'userservice__successful-user-login': [],
        'userservice__new-account-created': [],
      },
      criteria: [
        {
          id: 'open-active-cascade',
          text: 'Sets status=open with severity=80-critical for the cascade discovery because active database-connectivity failures broadly break core customer balance, transaction-history, payment, and deposit journeys. Bases critical severity on demonstrated customer impact and scope, without requiring PII exposure or a fixed downstream-service count.',
          score: 3,
        },
        {
          id: 'independent-verification',
          text: "Independently verifies at least one key signal via execute_esql before deciding — re-runs an evidence.esql_query from the cascade discovery's input signals[] and stamps confirmed: true from its own query results, rather than trusting pre-collected findings at face value.",
          score: 2,
        },
        {
          id: 'dismiss-benign-auth',
          text: 'Sets status=dismissed for both the benign login spike and the benign signup spike: successful authentication volume without failure symptoms, blocked user tasks, or sensitive-data exposure is not an actionable incident.',
          score: 3,
        },
        {
          id: 'do-not-escalate-benign-auth',
          text: 'Does not set status=open for either benign authentication discovery as if it were part of the ledger-db outage; both stay separate non-incident noise.',
          score: 2,
        },
      ],
    },
    metadata: { difficulty: 'medium', failure_domain: 'ledger-db', failure_mode: 'cascade' },
  },
  {
    id: 'ledger-db-disconnect-misgrouped-auth',
    input: {
      scenario_id: 'ledger-db-disconnect-misgrouped-auth',
      discoveries: [MISGROUPED_LEDGER_DISCOVERY],
    },
    output: {
      expected_ground_truth:
        'misgrouped ledger discovery remains open/80-critical for the database cascade; successful authentication signals remain unconfirmed and do not shape the event narrative',
      expected_confirmed_rule_uuids: {
        'ledger-db-disconnect__misgrouped-auth': LEDGER_DB_CASCADE_RULE_UUIDS,
      },
      criteria: [
        {
          id: 'reject-unrelated-auth-membership',
          text: 'Sets confirmed:false on Successful User Login and New User Account Created because their healthy rows do not support the ledger database event, and identifies them as unrelated in assessment_note.',
          score: 3,
        },
        {
          id: 'aligned-ledger-narrative',
          text: 'Keeps title, symptom_hypothesis, and summary scoped to the confirmed ledger database connectivity cascade without incorporating authentication activity.',
          score: 3,
        },
        {
          id: 'open-confirmed-cascade',
          text: 'Keeps the event open at critical severity because freshly verified ledger signals still demonstrate the user-blocking database cascade.',
          score: 2,
        },
      ],
    },
    metadata: {
      difficulty: 'hard',
      failure_domain: 'ledger-db',
      failure_mode: 'misgrouped-signal',
    },
    snapshot_source: { snapshot_name: 'ledger-db-disconnect' },
  },
];
