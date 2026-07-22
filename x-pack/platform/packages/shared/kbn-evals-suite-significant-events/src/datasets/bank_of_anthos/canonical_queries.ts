/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { E2ECanonicalQuery } from '../types';

/**
 * Canonical rule-backed KI queries for the bank-of-anthos end-to-end eval.
 *
 * Each query mirrors one detection signal from the canonical ledger-db cascade / benign-auth
 * discoveries in `discovery.ts` and keeps the SAME `rule_uuid`, so the produced detections line
 * up with `expected_discoveries[].signals[].metadata.rule_uuid` for the grouping evaluators.
 *
 * All severity scores sit in the critical band (>= 80) on purpose: critical-cadence rules honour
 * the detection workflow's `lookback`/`bucketInterval` inputs, which the e2e spec sizes to the
 * replayed log window. This is an eval-control decision, not a severity ground truth — the
 * discovery and judge agents assess severity from evidence, never from these scores.
 */

const CASCADE_QUERIES: E2ECanonicalQuery[] = [
  {
    query_id: 'e2e-transactionhistory-sql-connection-error',
    rule_uuid: 'db7de543-0f37-5db4-a0ff-c75c92f0eca1',
    title: 'Transaction History Database SQL Connection Error',
    description:
      'JDBC connection failures (SQLState 08001) from transactionhistory to the postgresql ledger backend.',
    esql: 'FROM logs | WHERE MATCH_PHRASE(body.text, "SQLState: 08001")',
    severity_score: 90,
  },
  {
    query_id: 'e2e-frontend-transactionhistory-connection-failures',
    rule_uuid: '2cd4c371-f1c3-5c19-a115-1c03be31317e',
    title: 'Frontend → Transaction History Connection Failures',
    description:
      'Frontend failing to fetch the transaction list from transactionhistory (user-visible transaction history outage).',
    esql: 'FROM logs | WHERE MATCH_PHRASE(body.text, "Error getting transaction_list")',
    severity_score: 85,
  },
  {
    query_id: 'e2e-frontend-balancereader-connection-failures',
    rule_uuid: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a',
    title: 'Frontend → Balance Reader Connection Failures',
    description:
      'Frontend failing to fetch account balances from balancereader (user-visible balance outage).',
    esql: 'FROM logs | WHERE MATCH_PHRASE(body.text, "Error getting balance")',
    severity_score: 85,
  },
  {
    query_id: 'e2e-ledger-cache-errors',
    rule_uuid: '159d6c01-9b26-5d7f-99c6-a3471e00d97e',
    title: 'Cache Errors in Balance Reader or Transaction History',
    description:
      'Shared cache-layer read failures in balancereader and transactionhistory, downstream of the ledger database.',
    esql: 'FROM logs | WHERE MATCH_PHRASE(body.text, "Cache error")',
    severity_score: 85,
  },
  {
    query_id: 'e2e-ledgerwriter-balance-retrieval-failure',
    rule_uuid: '0ae69b00-d0f3-5c57-971d-2470ad5b6459',
    title: 'Ledger Writer Failed to Retrieve Account Balance',
    description:
      'Ledgerwriter unable to validate balances via balancereader, blocking payment and deposit commits.',
    esql: 'FROM logs | WHERE MATCH_PHRASE(body.text, "Failed to retrieve account balance")',
    severity_score: 85,
  },
  {
    query_id: 'e2e-frontend-ledgerwriter-deposit-error',
    rule_uuid: '64f04c77-495a-58cb-beba-98108fcaa5dd',
    title: 'Frontend → Ledger Writer Deposit Submission Error',
    description: 'Frontend failing to submit deposit transactions to ledgerwriter.',
    esql: 'FROM logs | WHERE MATCH_PHRASE(body.text, "Error submitting deposit")',
    severity_score: 85,
  },
  {
    query_id: 'e2e-frontend-ledgerwriter-payment-error',
    rule_uuid: '431f1573-2ad6-5847-9602-283c63450d6b',
    title: 'Frontend → Ledger Writer Payment Submission Error',
    description: 'Frontend failing to submit payment transactions to ledgerwriter.',
    esql: 'FROM logs | WHERE MATCH_PHRASE(body.text, "Error submitting payment")',
    severity_score: 85,
  },
];

const BENIGN_AUTH_QUERIES: E2ECanonicalQuery[] = [
  {
    query_id: 'e2e-userservice-successful-login',
    rule_uuid: '0dfb4f2f-2060-5369-9d75-02287ea4e060',
    title: 'Successful User Login',
    description:
      'Successful login volume in userservice — operational baseline monitoring, not an error signal.',
    esql: 'FROM logs | WHERE MATCH_PHRASE(body.text, "Login Successful")',
    severity_score: 80,
  },
  {
    query_id: 'e2e-userservice-account-created',
    rule_uuid: '334488fe-8405-5e30-b538-ba028b6b0961',
    title: 'New User Account Created',
    description:
      'Successful account-creation volume in userservice — operational baseline monitoring, not an error signal.',
    esql: 'FROM logs | WHERE MATCH_PHRASE(body.text, "Successfully created user")',
    severity_score: 80,
  },
];

export const CASCADE_RULE_UUIDS = CASCADE_QUERIES.map((query) => query.rule_uuid);
export const BENIGN_AUTH_RULE_UUIDS = BENIGN_AUTH_QUERIES.map((query) => query.rule_uuid);

export const e2eCanonicalQueries: E2ECanonicalQuery[] = [
  ...CASCADE_QUERIES,
  ...BENIGN_AUTH_QUERIES,
];
