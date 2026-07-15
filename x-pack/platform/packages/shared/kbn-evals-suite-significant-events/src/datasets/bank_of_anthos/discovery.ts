/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detection, Discovery } from '@kbn/significant-events-schema';
import type { DatasetConfig } from '../types';

const toInputDetections = (discoveries: Array<Partial<Discovery>>): Array<Partial<Detection>> =>
  discoveries
    .flatMap((discovery) => discovery.detections ?? [])
    .map((detection) => ({
      ...detection,
      change_point_type: 'spike' as const,
      p_value: 0.0001,
    }));

/**
 * Canonical cascade discovery — the lean ground truth shared by the discovery (expected output)
 * and the judge (input) agents. Evidences carry the `esql_query` to re-run but are deliberately NOT
 * pre-stamped `confirmed` — the judge must re-verify each query via execute_esql and stamp
 * `confirmed: true` itself before promoting (Critical Rule 5). Every field here is seeded by one of
 * the cascade `detections`, so the canonical input and this expected answer stay self-consistent.
 */
const LEDGER_DB_CASCADE_DISCOVERY: Partial<Discovery> = {
  kind: 'discovery',
  discovery_slug: 'transactionhistory__frontend-transactionhistory-read-timeout',
  title:
    'transactionhistory — DB and cache layer: connection failures cascading to frontend read timeouts',
  summary:
    'balancereader, transactionhistory, and ledgerwriter are all returning connection-refused errors to the frontend, with concurrent cache errors in balancereader/transactionhistory and a SQL connection failure (SQLState 08001) in transactionhistory. Users cannot view account balances, cannot view transaction history, and cannot submit payments or deposits. Onset ~14:30 UTC with no sign of recovery.',
  root_cause:
    "balancereader and transactionhistory are failing because their shared cache layer is returning errors, and transactionhistory's connection pool cannot reach the postgresql backend (SQLState 08001). The cache and connection failures make balancereader and transactionhistory unresponsive, so the frontend receives connection-refused errors on all balance and transaction-history calls. ledgerwriter additionally fails because it calls balancereader to validate balances before committing, propagating the outage to payment and deposit submissions.",
  criticality: 90,
  confidence: 82,
  detections: [
    {
      detection_id: 'db7de543-0f37-5db4-a0ff-c75c92f0eca1-det',
      rule_name: 'Transaction History Database SQL Connection Error',
      rule_uuid: 'db7de543-0f37-5db4-a0ff-c75c92f0eca1',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
    {
      detection_id: '2cd4c371-f1c3-5c19-a115-1c03be31317e-det',
      rule_name: 'Frontend → Transaction History Connection Failures',
      rule_uuid: '2cd4c371-f1c3-5c19-a115-1c03be31317e',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
    {
      detection_id: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a-det',
      rule_name: 'Frontend → Balance Reader Connection Failures',
      rule_uuid: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
    {
      detection_id: '159d6c01-9b26-5d7f-99c6-a3471e00d97e-det',
      rule_name: 'Cache Errors in Balance Reader or Transaction History',
      rule_uuid: '159d6c01-9b26-5d7f-99c6-a3471e00d97e',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
    {
      detection_id: '0ae69b00-d0f3-5c57-971d-2470ad5b6459-det',
      rule_name: 'Ledger Writer Failed to Retrieve Account Balance',
      rule_uuid: '0ae69b00-d0f3-5c57-971d-2470ad5b6459',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
    {
      detection_id: '64f04c77-495a-58cb-beba-98108fcaa5dd-det',
      rule_name: 'Frontend → Ledger Writer Deposit Submission Error',
      rule_uuid: '64f04c77-495a-58cb-beba-98108fcaa5dd',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
    {
      detection_id: '431f1573-2ad6-5847-9602-283c63450d6b-det',
      rule_name: 'Frontend → Ledger Writer Payment Submission Error',
      rule_uuid: '431f1573-2ad6-5847-9602-283c63450d6b',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
  ],
  cause_kis: [
    { name: 'transactionhistory', stream_name: 'logs' },
    { name: 'balancereader', stream_name: 'logs' },
    { name: 'ledgerwriter', stream_name: 'logs' },
  ],
  dependency_edges: [
    { source: 'frontend', target: 'balancereader', exposure: 'exposed' },
    { source: 'frontend', target: 'transactionhistory', exposure: 'exposed' },
    { source: 'frontend', target: 'ledgerwriter', exposure: 'exposed' },
    { source: 'ledgerwriter', target: 'balancereader', exposure: 'exposed' },
    { source: 'ledgerwriter', target: 'postgresql', exposure: 'not_exposed' },
    { source: 'transactionhistory', target: 'postgresql', exposure: 'exposed' },
  ],
  // Lean evidence trail — carries the `esql_query` for the judge to re-run; no `confirmed` stamp
  // (the judge must verify each query itself and stamp `confirmed: true` before promoting).
  evidences: [
    {
      rule_name: 'Transaction History Database SQL Connection Error',
      rule_uuid: 'db7de543-0f37-5db4-a0ff-c75c92f0eca1',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether transactionhistory cannot obtain SQL connections to the postgresql backend. Expected if true: SQLState 08001 connection-failure errors on the JDBC path. Found: 1 row at 14:34:19Z — SQL Error 0, SQLState: 08001 (connection refused) from transactionhistory. Verdict: confirms — the database backend is unreachable, breaking transaction-history reads.',
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "SQLState: 08001") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'Frontend → Transaction History Connection Failures',
      rule_uuid: '2cd4c371-f1c3-5c19-a115-1c03be31317e',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether the frontend is actively failing to reach transactionhistory with connection-refused errors. Expected if true: HTTPConnectionPool connection refused to transactionhistory:8080. Found: 1 row at 14:33:36Z — connection refused (Errno 111) to transactionhistory:8080 on the /transactions path. Verdict: confirms — users cannot view transaction history; the backend failure is user-visible.',
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error getting transaction_list") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'Frontend → Balance Reader Connection Failures',
      rule_uuid: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether the frontend is actively failing to reach balancereader with connection-refused errors. Expected if true: HTTPConnectionPool connection refused to balancereader:8080. Found: 1 row at 14:33:35Z — connection refused (Errno 111) to balancereader:8080 on the /balances path. Verdict: confirms — earliest confirmed failure in the cascade; users cannot view account balances.',
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error getting balance") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'Cache Errors in Balance Reader or Transaction History',
      rule_uuid: '159d6c01-9b26-5d7f-99c6-a3471e00d97e',
      stream_name: 'logs',
      result: 'found',
      row_count: 2,
      description:
        "Testing: whether the shared cache layer is failing as a downstream effect of the database outage, across both transactionhistory and balancereader. Expected if true: 'Cache error' entries from both services. Found: 2 rows at 14:34:59Z — transactionhistory emitting 'getTransactions | Cache error' and balancereader emitting 'getBalance | Cache error'. Verdict: confirms — cache reads are failing in both services, broadening the blast radius from transaction-history reads to balance lookups.",
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Cache error") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 2',
    },
    {
      rule_name: 'Ledger Writer Failed to Retrieve Account Balance',
      rule_uuid: '0ae69b00-d0f3-5c57-971d-2470ad5b6459',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        "Testing: whether ledgerwriter is blocked from committing transactions because it cannot retrieve account balances from balancereader. Expected if true: ERROR from LedgerWriterController 'Failed to retrieve account balance'. Found: 1 row at 14:34:29Z — ledgerwriter logging 'Failed to retrieve account balance'. Verdict: confirms — ledgerwriter cannot validate balances via balancereader, so payment and deposit submissions fail.",
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Failed to retrieve account balance") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'Frontend → Ledger Writer Deposit Submission Error',
      rule_uuid: '64f04c77-495a-58cb-beba-98108fcaa5dd',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether the frontend is failing to submit deposit transactions to ledgerwriter with connection-refused errors. Expected if true: HTTPConnectionPool connection refused to ledgerwriter:8080. Found: 1 row at 14:33:39Z — connection refused (Errno 111) to ledgerwriter:8080 on the /transactions path. Verdict: confirms — deposit submissions are failing; users cannot complete deposit transactions.',
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error submitting deposit") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'Frontend → Ledger Writer Payment Submission Error',
      rule_uuid: '431f1573-2ad6-5847-9602-283c63450d6b',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether the frontend is failing to submit payment transactions to ledgerwriter with connection-refused errors. Expected if true: HTTPConnectionPool connection refused to ledgerwriter:8080. Found: 1 row at 14:33:38Z — connection refused (Errno 111) to ledgerwriter:8080 on the /transactions path. Verdict: confirms — payment submissions are failing; users cannot complete payment transactions.',
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error submitting payment") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
  ],
};

/** Benign authentication activity spike — must stay a SEPARATE discovery from the failure cascade. */
const BENIGN_AUTH_DISCOVERY: Partial<Discovery> = {
  kind: 'discovery',
  discovery_slug: 'userservice__successful-user-login',
  title: 'User Service — login and account creation: successful activity volume spike',
  summary:
    'userservice is logging a spike in successful login and account-creation events. No user-blocking failure is occurring — all observed events are successful completions, consistent with load-generator activity ramping up around 14:30 UTC. This is a separate, independent signal from the backend cascade and does not represent a failure condition.',
  root_cause:
    'Normal load-driven volume increase in successful login and account-creation traffic; all operations succeeded — no failure condition.',
  criticality: 10,
  confidence: 68,
  detections: [
    {
      detection_id: '0dfb4f2f-2060-5369-9d75-02287ea4e060-det',
      rule_name: 'Successful User Login',
      rule_uuid: '0dfb4f2f-2060-5369-9d75-02287ea4e060',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
    {
      detection_id: '334488fe-8405-5e30-b538-ba028b6b0961-det',
      rule_name: 'New User Account Created',
      rule_uuid: '334488fe-8405-5e30-b538-ba028b6b0961',
      stream_name: 'logs',
      change_point_type: 'spike',
      p_value: 0.0001,
    },
  ],
  cause_kis: [{ name: 'userservice', stream_name: 'logs' }],
  evidences: [
    {
      rule_name: 'Successful User Login',
      rule_uuid: '0dfb4f2f-2060-5369-9d75-02287ea4e060',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether the spike in successful logins represents a failure or anomalous activity. Expected if true: error logs or credential-stuffing patterns. Found: 1 row at 14:30:05Z — successful login event with no error signature. Verdict: refutes — the spike is a volume increase in successful logins, consistent with load-generator ramp-up.',
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Login Successful") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'New User Account Created',
      rule_uuid: '334488fe-8405-5e30-b538-ba028b6b0961',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether the spike in new account creations represents a failure or anomalous activity. Expected if true: error logs or suspicious automated-creation patterns. Found: 1 row at 14:30:12Z — successful account-creation event with no error signature. Verdict: refutes — the spike is a volume increase in successful account creations, consistent with load-generator ramp-up.',
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Successfully created user") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
  ],
};

export const discovery: DatasetConfig['discovery'] = [
  {
    input: {
      scenario_id: 'ledger-db-disconnect',
      stream_name: 'logs',
      detections: toInputDetections([LEDGER_DB_CASCADE_DISCOVERY, BENIGN_AUTH_DISCOVERY]),
    },
    // Ground-truth continuation chains (ordered, by readable `rule_name`) the continuation eval
    // replays one rule per cycle. Each chain legitimately continues ONE episode, so the agent
    // should reuse a single slug. `semantic` = same service + symptom, no rule_uuid overlap;
    // `cascade` = upstream → downstreams across services, linked by dependency topology.
    continuationChains: {
      semantic: [
        'Frontend → Ledger Writer Payment Submission Error',
        'Frontend → Ledger Writer Deposit Submission Error',
      ],
      cascade: [
        'Transaction History Database SQL Connection Error',
        'Frontend → Transaction History Connection Failures',
        'Ledger Writer Failed to Retrieve Account Balance',
      ],
    },
    output: {
      expected_ground_truth:
        'discoveries=[ledger-db-cascade (transactionhistory/balancereader/ledgerwriter->postgresql SQLState 08001, cache errors, frontend connection-refused failures), benign-auth (successful login/signup spike, no failures)]',
      expected_discoveries: [LEDGER_DB_CASCADE_DISCOVERY, BENIGN_AUTH_DISCOVERY],
      criteria: [
        {
          id: 'root-cause-sql-connection',
          text: 'Identifies the transactionhistory↔postgresql SQL connection failure (SQLState 08001 / failed JDBC connections) as the root cause of the failure cascade.',
          score: 3,
        },
        {
          id: 'cascade-transactionhistory-cluster',
          text: 'Groups the SQL connection failure, the shared cache errors, and the frontend→transactionhistory connection failures into a single discovery (transactionhistory service cluster).',
          score: 1,
        },
        {
          id: 'cascade-full-grouping',
          text: 'Further collapses the frontend→balancereader connection failures and the ledgerwriter balance-retrieval, payment, and deposit failures into the same cascading discovery as the transactionhistory cluster — all seven detections linked under the shared postgresql/cache root cause rather than split into separate service-scoped discoveries.',
          score: 2,
        },
        {
          id: 'separate-benign-auth',
          text: 'Keeps the benign authentication activity (successful logins, new account creation) grouped together in a single discovery, separate from the failure cascade — does not lump them into the database incident, and does not emit login and account creation as two separate discoveries.',
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
      discoveries: [LEDGER_DB_CASCADE_DISCOVERY, BENIGN_AUTH_DISCOVERY],
    },
    output: {
      expected_ground_truth:
        'cascade discovery (transactionhistory/balancereader/ledgerwriter → postgresql SQLState 08001, ' +
        'user-blocking connection-refused failures)=promoted; ' +
        'benign authentication spike (successful logins/signups only, no failures)=demoted',
      criteria: [
        {
          id: 'promote-active-cascade',
          text: 'Promotes the cascade discovery: active database-connectivity failures cascading to user-facing connection-refused errors across balancereader, transactionhistory, and ledgerwriter warrant immediate on-call action.',
          score: 3,
        },
        {
          id: 'independent-verification',
          text: "Independently verifies at least one key evidence via execute_esql before deciding — re-runs an esql_query from the cascade discovery's input evidences[] and stamps confirmed: true from its own query results, rather than trusting pre-collected findings at face value.",
          score: 2,
        },
        {
          id: 'demote-benign-auth',
          text: 'Demotes the benign authentication spike: successful login and account-creation volume without failure symptoms, blocked user tasks, or sensitive-data exposure is not an actionable incident.',
          score: 3,
        },
        {
          id: 'do-not-escalate-benign-auth',
          text: 'Does not promote or acknowledge the benign authentication spike as if it were part of the ledger-db outage; it stays separate non-incident noise.',
          score: 2,
        },
      ],
    },
    metadata: { difficulty: 'medium', failure_domain: 'ledger-db', failure_mode: 'cascade' },
  },
];
