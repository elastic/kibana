/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/streams-plugin/common/significant_events_tuning_config';
import type { Discovery, Detection } from '@kbn/streams-schema';
import {
  BANK_OF_ANTHOS_GCS_BASE_PATH_PREFIX,
  BANK_OF_ANTHOS_NAMESPACE,
  GCS_BUCKET,
} from '../constants';
import type { DatasetConfig } from './types';

const toInputDetections = (discoveries: Array<Partial<Discovery>>): Array<Partial<Detection>> =>
  discoveries
    .flatMap((discovery) => discovery.detections ?? [])
    .map((detection) => ({
      ...detection,
      detection_evidence: {
        change_point_type: 'spike',
        p_value: 0.0001,
      },
    }));

/**
 * Canonical cascade discovery — the lean ground truth shared by the investigator (expected output)
 * and the judge (input). Evidences carry the `esql_query` to re-run but are deliberately NOT
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
    'transactionhistory, balancereader, and ledgerwriter are failing off the same ledger-db outage: transactionhistory cannot obtain SQL connections to ledger-db (SQLState 08001) and its HikariCP pool fails to initialize, cache errors surface in transactionhistory and balancereader, frontend read requests to transactionhistory are timing out, and ledgerwriter cannot retrieve account balances from balancereader to commit transactions. Users cannot view transaction history or account balances, and payment/deposit submissions fail. Onset ~14:30 UTC with no sign of recovery.',
  root_cause:
    "transactionhistory's HikariCP connection pool cannot reach the ledger-db PostgreSQL backend (SQLState 08001); the shared cache layer then errors, so transactionhistory and balancereader cannot serve reads and the frontend receives read timeouts on transaction-history calls. ledgerwriter additionally fails because it calls balancereader to validate balances before committing, propagating the outage to payment and deposit submissions.",
  criticality: 90,
  confidence: 82,
  detections: [
    {
      kind: 'detection',
      rule_name: 'Transaction history SQL connection failure',
      rule_uuid: '52ad96d3-5d06-5baa-b2de-cd654fbe33f6',
      stream_name: 'logs',
    },
    {
      kind: 'detection',
      rule_name: 'HikariCP connection pool initialization',
      rule_uuid: 'f0816e40-c465-563f-91fc-280e23a4ef4e',
      stream_name: 'logs',
    },
    {
      kind: 'detection',
      rule_name: 'Transaction history cache errors',
      rule_uuid: 'e2b04e1f-44ed-582f-8e4f-9f62e4706141',
      stream_name: 'logs',
    },
    {
      kind: 'detection',
      rule_name: 'Balance reader cache errors',
      rule_uuid: '5961763e-fabc-5bdc-a5fc-aa2c5c4af768',
      stream_name: 'logs',
    },
    {
      kind: 'detection',
      rule_name: 'Frontend → transactionhistory read timeout',
      rule_uuid: '1432a71f-0833-55c7-93f4-ac40261e47df',
      stream_name: 'logs',
    },
    {
      kind: 'detection',
      rule_name: 'Ledger writer failed to retrieve account balance',
      rule_uuid: 'c3a7f1e9-4b2d-5e86-9a1c-7d3f2b8e0a64',
      stream_name: 'logs',
    },
  ],
  cause_kis: [
    { name: 'transactionhistory', stream_name: 'logs' },
    { name: 'balancereader', stream_name: 'logs' },
    { name: 'ledgerwriter', stream_name: 'logs' },
  ],
  dependency_edges: [
    { source: 'transactionhistory', target: 'ledger-db', exposure: 'exposed' },
    { source: 'balancereader', target: 'ledger-db', exposure: 'exposed' },
    { source: 'frontend', target: 'transactionhistory', exposure: 'exposed' },
    { source: 'ledgerwriter', target: 'balancereader', exposure: 'exposed' },
    { source: 'ledgerwriter', target: 'ledger-db', exposure: 'exposed' },
  ],
  // Lean evidence trail — carries the `esql_query` for the judge to re-run; no `confirmed` stamp
  // (the judge must verify each query itself and stamp `confirmed: true` before promoting).
  evidences: [
    {
      rule_name: 'Transaction history SQL connection failure',
      rule_uuid: '52ad96d3-5d06-5baa-b2de-cd654fbe33f6',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether transactionhistory cannot obtain SQL connections to the ledger-db PostgreSQL backend. Expected if true: SQLState 08001 connection-failure errors on the JDBC path. Found: 1 row at 14:34:19Z — SQL Error 0, SQLState: 08001 (connection refused) from transactionhistory. Verdict: confirms — the database backend is unreachable, breaking transaction-history reads.',
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "SQLState: 08001") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'HikariCP connection pool initialization',
      rule_uuid: 'f0816e40-c465-563f-91fc-280e23a4ef4e',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        "Testing: whether transactionhistory's HikariCP connection pool is repeatedly failing to initialize against ledger-db. Expected if true: recurring 'HikariPool-1 - Starting' re-initialization lines on the JDBC path. Found: 1 row at 14:34:19Z — HikariPool-1 restarting as it fails to acquire a database connection. Verdict: confirms — the pool cannot establish connections, the mechanism behind the SQLState 08001 failures.",
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "HikariPool-1 - Starting") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'Transaction history cache errors',
      rule_uuid: 'e2b04e1f-44ed-582f-8e4f-9f62e4706141',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        "Testing: whether transactionhistory's cache layer is failing as a downstream effect of the database outage. Expected if true: 'getTransactions | Cache error' entries from transactionhistory. Found: 1 row at 14:34:59Z — transactionhistory emitting 'getTransactions | Cache error'. Verdict: confirms — cache reads are failing, leaving transactionhistory unable to serve transaction lists.",
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "getTransactions | Cache error") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'Balance reader cache errors',
      rule_uuid: '5961763e-fabc-5bdc-a5fc-aa2c5c4af768',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        "Testing: whether balancereader is hit by the same cache failure as transactionhistory. Expected if true: 'getBalance | Cache error' entries from balancereader. Found: 1 row at 14:34:59Z — balancereader emitting 'getBalance | Cache error' from the same DB outage. Verdict: confirms — the failure spans both read services, broadening the blast radius to balance lookups.",
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "getBalance | Cache error") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'Frontend → transactionhistory read timeout',
      rule_uuid: '1432a71f-0833-55c7-93f4-ac40261e47df',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'Testing: whether the database cascade surfaces to end users as frontend read failures against transactionhistory. Expected if true: HTTPConnectionPool read timeout / connection refused from frontend to transactionhistory:8080. Found: 1 row at 14:33:36Z — connection refused (Errno 111) to transactionhistory:8080 on the /transactions path. Verdict: confirms — users cannot view transaction history; the backend failure is user-visible.',
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Error getting transaction_list") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
    },
    {
      rule_name: 'Ledger writer failed to retrieve account balance',
      rule_uuid: 'c3a7f1e9-4b2d-5e86-9a1c-7d3f2b8e0a64',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        "Testing: whether ledgerwriter is blocked from committing transactions because it cannot retrieve account balances from balancereader. Expected if true: ERROR from LedgerWriterController 'Failed to retrieve account balance'. Found: 1 row at 14:34:29Z — ledgerwriter logging 'Failed to retrieve account balance'. Verdict: confirms — ledgerwriter cannot validate balances via balancereader, so payment and deposit submissions fail.",
      esql_query:
        'FROM logs | WHERE @timestamp >= "2026-06-25T14:30:00Z" AND @timestamp <= NOW() | WHERE MATCH_PHRASE(body.text, "Failed to retrieve account balance") | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1',
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
      kind: 'detection',
      rule_name: 'Successful user login',
      rule_uuid: 'cbfedad7-d40c-5dde-a84f-d1cba23084b3',
      stream_name: 'logs',
    },
    {
      kind: 'detection',
      rule_name: 'New user account created',
      rule_uuid: 'd60afc3c-dac9-51b5-b55d-bfd6c522b269',
      stream_name: 'logs',
    },
  ],
  cause_kis: [{ name: 'userservice', stream_name: 'logs' }],
};

export const bankOfAnthosDataset: DatasetConfig = {
  id: BANK_OF_ANTHOS_NAMESPACE,
  description: 'Bank of Anthos sample banking microservices application',
  gcs: { bucket: GCS_BUCKET, basePathPrefix: BANK_OF_ANTHOS_GCS_BASE_PATH_PREFIX },
  kiFeatureExtraction: [
    {
      input: {
        scenario_id: 'healthy-baseline',
      },
      output: {
        criteria: [
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service as an entity (evidence: resource.attributes.app=frontend OR resource.attributes.k8s.deployment.name=frontend)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app.keyword': 'frontend' } }],
          },
          {
            id: 'entity-userservice',
            text: 'Must identify userservice as an entity (evidence: resource.attributes.app=userservice)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app.keyword': 'userservice' } }],
          },
          {
            id: 'entity-contacts',
            text: 'Must identify contacts service as an entity (evidence: resource.attributes.app=contacts)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app.keyword': 'contacts' } }],
          },
          {
            id: 'entity-ledgerwriter',
            text: 'Must identify ledgerwriter service as an entity (evidence: resource.attributes.app=ledgerwriter)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app.keyword': 'ledgerwriter' } }],
          },
          {
            id: 'entity-balancereader',
            text: 'Must identify balancereader service as an entity (evidence: resource.attributes.app=balancereader)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app.keyword': 'balancereader' } }],
          },
          {
            id: 'entity-transactionhistory',
            text: 'Must identify transactionhistory service as an entity (evidence: resource.attributes.app=transactionhistory)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app.keyword': 'transactionhistory' } },
            ],
          },
          {
            id: 'entity-ledger-db',
            text: 'Must identify ledger-db as an entity (evidence: resource.attributes.app=ledger-db)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app.keyword': 'ledger-db' } }],
          },
          {
            id: 'entity-accounts-db',
            text: 'Must identify accounts-db as an entity (evidence: resource.attributes.app=accounts-db)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app.keyword': 'accounts-db' } }],
          },
          {
            id: 'entity-load-generator',
            text: 'Must identify the load generator as an entity (evidence: resource.attributes.app=loadgenerator)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app.keyword': 'loadgenerator' } }],
          },
          {
            id: 'dep-ledgerwriter-ledger-db',
            text: 'Must identify the dependency ledgerwriter -> ledger-db (evidence: JDBC connections)',
            score: 2,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'ledgerwriter' } },
                    { match_phrase: { 'body.text': 'JDBC connections' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'dep-balancereader-ledger-db',
            text: 'Must identify the dependency balancereader -> ledger-db (evidence: JDBC read connections for balance lookups)',
            score: 2,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'balancereader' } },
                    { match_phrase: { 'body.text': 'org.postgresql.jdbc.PgConnection' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'dep-transactionhistory-ledger-db',
            text: 'Must identify the dependency transactionhistory -> ledger-db (evidence: JDBC read connections for transaction history)',
            score: 2,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'transactionhistory' } },
                    { match_phrase: { 'body.text': 'org.postgresql.jdbc.PgConnection' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'dep-userservice-accounts-db',
            text: 'Must identify the dependency userservice -> accounts-db (evidence: JDBC connections for user account storage)',
            score: 2,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'userservice' } },
                    {
                      bool: {
                        should: [
                          { match_phrase: { 'body.text': 'create_user' } },
                          { match_phrase: { 'body.text': 'login' } },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                },
              },
            ],
          },
          {
            id: 'dep-frontend-balancereader',
            text: 'Must identify the dependency frontend -> balancereader (evidence: HTTP connection errors from frontend to balancereader:8080)',
            score: 2,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'frontend' } },
                    {
                      match_phrase: {
                        'body.text': "HTTPConnectionPool(host='balancereader', port=8080)",
                      },
                    },
                  ],
                },
              },
            ],
          },
          {
            id: 'dep-frontend-ledgerwriter',
            text: 'Must identify the dependency frontend -> ledgerwriter (evidence: HTTP calls from frontend to submit transactions)',
            score: 2,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'frontend' } },
                    {
                      bool: {
                        should: [
                          {
                            match_phrase: {
                              'body.text': 'payment',
                            },
                          },
                          {
                            match_phrase: {
                              'body.text': 'deposit',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                },
              },
            ],
          },
          {
            id: 'dep-frontend-userservice',
            text: 'Must identify the dependency frontend -> userservice (evidence: HTTP calls from frontend for login/account lookup)',
            score: 2,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'frontend' } },
                    {
                      bool: {
                        should: [
                          { match_phrase: { 'body.text': 'logout' } },
                          { match_phrase: { 'body.text': '_login_helper' } },
                          { match_phrase: { 'body.text': 'signup' } },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                },
              },
            ],
          },
          {
            id: 'dep-loadgenerator-frontend',
            text: 'Should identify the dependency loadgenerator -> frontend (evidence: HTTP request statistics to frontend endpoints)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'loadgenerator' } },
                    {
                      bool: {
                        should: [
                          { match_phrase: { 'body.text': '/home' } },
                          { match_phrase: { 'body.text': '/payment' } },
                          { match_phrase: { 'body.text': '/deposit' } },
                          { match_phrase: { 'body.text': '/login' } },
                          { match_phrase: { 'body.text': '/logout' } },
                          { match_phrase: { 'body.text': '/signup' } },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                },
              },
            ],
          },
          {
            id: 'infra-kubernetes',
            text: 'Must identify Kubernetes as infrastructure (evidence: k8s pod/container metadata present)',
            score: 1,
            sampling_filters: [{ exists: { field: 'resource.attributes.k8s.pod.name' } }],
          },
        ],
        min_features: 10,
        max_features: 40,
        required_types: ['entity', 'dependency'],
        expect_entity_filters: true,
        expected_ground_truth:
          'entities=[frontend, userservice, contacts, ledgerwriter, balancereader, transactionhistory, ledger-db, accounts-db], deps=[ledgerwriter->ledger-db, balancereader->ledger-db, transactionhistory->ledger-db, userservice->accounts-db, frontend->balancereader, frontend->ledgerwriter, frontend->userservice, loadgenerator->frontend], infra=[kubernetes]',
      },
      metadata: {
        difficulty: 'easy',
        failure_domain: 'none',
      },
    },
    {
      input: {
        scenario_id: 'ledger-db-disconnect',
        log_query_filter: [
          {
            terms: {
              'resource.attributes.app.keyword': [
                'ledgerwriter',
                'balancereader',
                'transactionhistory',
                'frontend',
              ],
            },
          },
          {
            bool: {
              should: [
                { match_phrase: { 'body.text': 'Failed to retrieve account balance' } },
                { match_phrase: { 'body.text': 'The connection attempt failed' } },
                { match_phrase: { 'body.text': 'getBalance | Cache error' } },
                { match_phrase: { 'body.text': 'getTransactions | Cache error' } },
                { match_phrase: { 'body.text': 'SQLState: 08001' } },
                {
                  match_phrase: {
                    'body.text':
                      "Error submitting payment: HTTPConnectionPool(host='ledgerwriter', port=8080): Read timed out",
                  },
                },
                {
                  match_phrase: {
                    'body.text':
                      "Error getting transaction_list: HTTPConnectionPool(host='transactionhistory', port=8080): Read timed out",
                  },
                },
                {
                  match_phrase: {
                    'body.text':
                      "Error getting balance: HTTPConnectionPool(host='balancereader', port=8080): Read timed out",
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
      output: {
        criteria: [
          {
            id: 'entity-ledgerwriter',
            text: 'Must identify ledgerwriter as a failing entity (evidence: resource.attributes.app=ledgerwriter; JDBC connection errors to ledger-db)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app.keyword': 'ledgerwriter' } },
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'ledgerwriter' } },
                    { match_phrase: { 'body.text': 'SQLState: 08001' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'entity-balancereader',
            text: 'Must identify balancereader as a failing entity (evidence: resource.attributes.app=balancereader; cannot read balances from ledger-db, cache errors)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app.keyword': 'balancereader' } },
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'balancereader' } },
                    { match_phrase: { 'body.text': 'getBalance | Cache error' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'entity-transactionhistory',
            text: 'Must identify transactionhistory as a failing entity (evidence: resource.attributes.app=transactionhistory; cannot read transactions from ledger-db, cache errors)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app.keyword': 'transactionhistory' } },
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'transactionhistory' } },
                    { match_phrase: { 'body.text': 'getTransactions | Cache error' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service (evidence: resource.attributes.app=frontend; upstream impact)',
            score: 1,
            sampling_filters: [
              { term: { 'resource.attributes.app.keyword': 'frontend' } },
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'frontend' } },
                    { match_phrase: { 'body.text': 'Read timed out' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'dep-services-ledger-db',
            text: 'Must identify the dependency ledgerwriter/balancereader/transactionhistory -> ledger-db (evidence: SQLState: 08001 connection refused, cache errors surfaced in service logs)',
            score: 3,
            sampling_filters: [
              {
                bool: {
                  should: [
                    {
                      bool: {
                        filter: [
                          { term: { 'resource.attributes.app.keyword': 'ledgerwriter' } },
                          { match_phrase: { 'body.text': 'SQLState: 08001' } },
                        ],
                      },
                    },
                    {
                      bool: {
                        filter: [
                          { term: { 'resource.attributes.app.keyword': 'balancereader' } },
                          { match_phrase: { 'body.text': 'getBalance | Cache error' } },
                        ],
                      },
                    },
                    {
                      bool: {
                        filter: [
                          { term: { 'resource.attributes.app.keyword': 'transactionhistory' } },
                          { match_phrase: { 'body.text': 'getTransactions | Cache error' } },
                        ],
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
          {
            id: 'error-signatures',
            text: 'Must reference actual observed error signatures: SQLState: 08001 (PostgreSQL connection refused), cache errors, timeouts in evidence',
            score: 2,
            sampling_filters: [
              {
                bool: {
                  should: [
                    { match_phrase: { 'body.text': 'SQLState: 08001' } },
                    { match_phrase: { 'body.text': 'Cache error' } },
                    { match_phrase: { 'body.text': 'The connection attempt failed' } },
                    { match_phrase: { 'body.text': 'Read timed out' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        ],
        min_features: 3,
        max_features: 20,
        required_types: ['entity', 'dependency'],
        expect_entity_filters: true,
        expected_ground_truth:
          'entities=[ledgerwriter, balancereader, transactionhistory, frontend], deps=[ledgerwriter->ledger-db (connection refused), balancereader->ledger-db (cache error), transactionhistory->ledger-db (cache error)], error_signatures=[SQLState: 08001, cache errors, timeouts]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'ledger-db',
        failure_mode: 'database_disconnect',
      },
    },
  ],
  kiFeatureDeduplication: [
    {
      input: {
        scenario_id: 'healthy-baseline',
        iterations: DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.max_iterations,
      },
    },
  ],
  kiFeatureExclusion: [
    {
      input: {
        scenario_id: 'healthy-baseline',
        sample_document_count: 20,
        exclude_count: 4,
        follow_up_runs: 3,
      },
    },
    {
      input: {
        scenario_id: 'healthy-baseline',
        sample_document_count: 20,
        exclude_count: 1,
        follow_up_runs: 3,
      },
    },
  ],
  discoveryInvestigator: [
    {
      input: {
        scenario_id: 'ledger-db-disconnect',
        stream_name: 'logs',
        // Single source: derive the input detection batch from the same discoveries used as the
        // expected output, so the stimulus and the expected grouping cannot drift apart.
        detections: toInputDetections([LEDGER_DB_CASCADE_DISCOVERY, BENIGN_AUTH_DISCOVERY]),
      },
      // Ground-truth continuation chains (ordered, by readable `rule_name`) the continuation eval
      // replays one rule per cycle. Each chain legitimately continues ONE episode, so the agent
      // should reuse a single slug. `semantic` = same service + symptom, no rule_uuid overlap;
      // `cascade` = upstream → downstreams across services, linked by dependency topology.
      continuationChains: {
        semantic: [
          'Transaction history SQL connection failure',
          'HikariCP connection pool initialization',
        ],
        cascade: [
          'Transaction history SQL connection failure',
          'Frontend → transactionhistory read timeout',
          'Ledger writer failed to retrieve account balance',
        ],
      },
      output: {
        expected_kind: 'discovery',
        expected_discoveries: [LEDGER_DB_CASCADE_DISCOVERY, BENIGN_AUTH_DISCOVERY],
        criteria: [
          {
            id: 'root-cause-sql-connection',
            text: 'Identifies the transactionhistory↔ledger-db SQL connection failure (SQLState 08001 / failed JDBC connections, HikariCP pool init) as the root cause of the failure cascade.',
            score: 3,
          },
          {
            id: 'cascade-grouping',
            text: 'Collapses the SQL connection failure, HikariCP pool init, cache-layer errors (transaction history + balance reader), the frontend→transactionhistory read timeout, and the ledgerwriter balance-retrieval failure into a single cascading discovery rather than separate unrelated incidents.',
            score: 2,
          },
          {
            id: 'separate-benign-auth',
            text: 'Keeps the benign authentication activity (successful logins, new account creation) as its own discovery, separate from the failure cascade — does not lump it into the database incident.',
            score: 2,
          },
          {
            id: 'dependency-chain',
            text: 'Names the dependency from transactionhistory to ledger-db (via HikariCP/JDBC) and the downstream impact on the frontend read path.',
            score: 1,
          },
          {
            id: 'error-signatures',
            text: 'Cites observed error signatures (SQLState 08001, cache error, read timeout) rather than generic phrasing.',
            score: 1,
          },
        ],
      },
      metadata: { difficulty: 'medium', failure_domain: 'ledger-db', failure_mode: 'cascade' },
    },
  ],
  discoveryJudge: [
    {
      input: {
        scenario_id: 'ledger-db-disconnect',
        discoveries: [LEDGER_DB_CASCADE_DISCOVERY],
      },
      output: {
        expected_status: 'promoted',
        expect_assessment_note: true,
        criteria: [
          {
            id: 'promote-active-cascade',
            text: 'Promotes the discovery: active database-connectivity failures cascading to user-facing transactionhistory read timeouts warrant immediate on-call action.',
            score: 3,
          },
          {
            id: 'independent-verification',
            text: 'Independently verifies via execute_esql (resolving the detections to query KIs through search_knowledge_indicators) before deciding — does not trust the discovery without running its own queries.',
            score: 2,
          },
        ],
      },
      metadata: { difficulty: 'medium', failure_domain: 'ledger-db', failure_mode: 'cascade' },
    },
  ],
  kiQueryGeneration: [
    {
      input: {
        scenario_id: 'healthy-baseline',
        stream_name: 'logs',
        stream_description:
          'Bank of Anthos application logs under healthy conditions with normal banking transactions across all microservices',
      },
      output: {
        criteria: [
          {
            id: 'healthy-baseline-queries',
            text: 'Should generate queries for operational monitoring (e.g., transaction throughput, service health, request volume) rather than error-focused detection since this is healthy traffic',
            score: 2,
          },
          {
            id: 'multi-service-coverage',
            text: 'Generated queries should cover multiple services present in the logs (e.g., frontend, ledgerwriter, balancereader, transactionhistory, userservice) rather than a single service only',
            score: 2,
          },
          {
            id: 'error-monitoring',
            text: 'Should generate proactive error detection queries (e.g., connection failures, HTTP errors, service unavailability) even though this is healthy traffic — the model should set up error monitoring based on entity and dependency features',
            score: 2,
            sampling_filters: [
              { match_phrase: { 'body.text': 'Connection refused' } },
              { match_phrase: { 'body.text': 'HTTPConnectionPool' } },
              { match_phrase: { 'body.text': 'Max retries exceeded' } },
            ],
          },
          {
            id: 'stats-aggregate-monitoring',
            text: 'Should generate at least one STATS query for aggregate monitoring (e.g., transaction throughput per service, request volume across ledgerwriter and loadgenerator) with calibrated thresholds documented in descriptions.',
            score: 1,
          },
        ],
        expected_categories: ['operational', 'error'],
        expect_stats: true,
        expected_ground_truth:
          'queries=[operational monitoring for service health/traffic/latency across frontend/ledgerwriter/balancereader/userservice/transactionhistory; proactive error detection using body.text patterns (Connection refused, HTTPConnectionPool, Max retries exceeded) grounded in entity and dependency features; STATS queries for aggregate transaction throughput and request volume monitoring with calibrated thresholds]',
      },
      metadata: {
        difficulty: 'easy',
        failure_domain: 'none',
      },
    },
    {
      input: {
        scenario_id: 'ledger-db-disconnect',
        stream_name: 'logs',
        stream_description:
          'Bank of Anthos logs where the ledger-db PostgreSQL database becomes unreachable, causing frontend, ledgerwriter, balancereader, and transactionhistory to fail',
      },
      output: {
        criteria: [
          {
            id: 'jdbc-error-query',
            text: 'Must generate an ES|QL query that catches JDBC/SQL connection errors (e.g: SQLState: 08001)',
            score: 3,
            sampling_filters: [
              { match_phrase: { 'body.text': 'SQLState: 08001' } },
              { match_phrase: { 'body.text': 'The connection attempt failed' } },
            ],
          },
          {
            id: 'ledger-db-disconnect-impact-query',
            text: 'Should generate a query detecting errors across frontend, ledgerwriter, balancereader, and transactionhistory services',
            score: 2,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app.keyword': 'frontend' } },
                    { match_phrase: { 'body.text': 'Read timed out' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'stats-error-rate-detection',
            text: 'Should generate a STATS query detecting elevated error rates during the ledger-db disconnect (e.g., JDBC connection error frequency spike across ledgerwriter/balancereader/transactionhistory, or cache error rate per service). The STATS query should complement the match-type error detection queries.',
            score: 2,
          },
        ],
        expected_categories: ['error', 'operational'],
        expect_stats: true,
        expected_ground_truth:
          'queries=[error detection for JDBC/SQL error, cache error, timeout, connection refused or connection attempt, upstream impact in frontend/ledgerwriter/balancereader/transactionhistory; STATS queries for aggregate error rate detection during ledger-db disconnect (JDBC error frequency, cache error rate per service)]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'ledger-db',
        failure_mode: 'database_disconnect',
      },
    },
  ],
};
