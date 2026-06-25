/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/streams-plugin/common/significant_events_tuning_config';
import type { Discovery } from '@kbn/streams-schema';
import {
  BANK_OF_ANTHOS_GCS_BASE_PATH_PREFIX,
  BANK_OF_ANTHOS_NAMESPACE,
  GCS_BUCKET,
} from '../constants';
import type { DatasetConfig } from './types';

// ---------------------------------------------------------------------------
// Canonical discoveries for the `ledger-db-disconnect` snapshot.
//
// These are the full Discovery docs (detections + evidences + cause_kis) the investigator is
// expected to produce — the exact shape the judge consumes as input (discovery.yaml output ===
// triage.yaml input). Defined once and shared: the investigator scenario uses them as
// `output.expected_discoveries` (the grouping gold derives from their detections), and the judge
// scenario feeds the cascade discovery in as `input.discoveries`, so the two stages can't drift.
//
// rule_name + rule_uuid match the snapshot's detection KIs verbatim; rule_uuid is the join key the
// agents use to resolve a detection to its query KI (→ ES|QL), so it must stay exact.
// ---------------------------------------------------------------------------

/** The transactionhistory↔ledger-db SQL-connectivity failure cascade (active, user-facing). */
const LEDGER_DB_CASCADE_DISCOVERY: Partial<Discovery> = {
  kind: 'discovery',
  discovery_slug: 'transactionhistory__frontend-transactionhistory-read-timeout',
  title:
    'transactionhistory — DB and cache layer: connection failures cascading to frontend timeouts',
  summary:
    'transactionhistory read requests are failing: the service cannot obtain SQL connections to ledger-db (SQLState 08001), HikariCP pools are failing to initialize, and cache errors plus a frontend→transactionhistory read timeout are surfacing to callers.',
  root_cause:
    'transactionhistory cannot establish SQL connections to the ledger-db PostgreSQL backend (SQLState 08001), failing HikariCP pool initialization and causing cache errors and frontend read timeouts downstream.',
  criticality: 80,
  confidence: 70,
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
  ],
  cause_kis: [
    { name: 'transactionhistory', stream_name: 'logs' },
    { name: 'ledger-db', stream_name: 'logs' },
  ],
  evidences: [
    {
      rule_name: 'Transaction history SQL connection failure',
      rule_uuid: '52ad96d3-5d06-5baa-b2de-cd654fbe33f6',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description: 'transactionhistory logging SQL Error 0, SQLState: 08001 (connection refused).',
      esql_query:
        'FROM logs | WHERE resource.attributes.app == "transactionhistory" AND body.text LIKE "*SQLState: 08001*" | STATS count = COUNT(*)',
    },
    {
      rule_name: 'HikariCP connection pool initialization',
      rule_uuid: 'f0816e40-c465-563f-91fc-280e23a4ef4e',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description: 'HikariCP pool (HikariPool-1) repeatedly re-initializing on the JDBC path.',
      esql_query:
        'FROM logs | WHERE resource.attributes.app == "transactionhistory" AND body.text LIKE "*HikariPool-1 - Starting*" | STATS count = COUNT(*)',
    },
    {
      rule_name: 'Transaction history cache errors',
      rule_uuid: 'e2b04e1f-44ed-582f-8e4f-9f62e4706141',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description: 'transactionhistory emitting "getTransactions | Cache error".',
      esql_query:
        'FROM logs | WHERE resource.attributes.app == "transactionhistory" AND body.text LIKE "*getTransactions | Cache error*" | STATS count = COUNT(*)',
    },
    {
      rule_name: 'Balance reader cache errors',
      rule_uuid: '5961763e-fabc-5bdc-a5fc-aa2c5c4af768',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description: 'balancereader emitting "getBalance | Cache error" from the same DB outage.',
      esql_query:
        'FROM logs | WHERE resource.attributes.app == "balancereader" AND body.text LIKE "*getBalance | Cache error*" | STATS count = COUNT(*)',
    },
    {
      rule_name: 'Frontend → transactionhistory read timeout',
      rule_uuid: '1432a71f-0833-55c7-93f4-ac40261e47df',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description:
        'frontend read timeouts to transactionhistory:8080 (HTTPConnectionPool ... Read timed out).',
      esql_query:
        'FROM logs | WHERE resource.attributes.app == "frontend" AND body.text LIKE "*host=\'transactionhistory\'*Read timed out*" | STATS count = COUNT(*)',
    },
  ],
};

/** Benign authentication activity spike — must stay a SEPARATE discovery from the failure cascade. */
const BENIGN_AUTH_DISCOVERY: Partial<Discovery> = {
  kind: 'discovery',
  discovery_slug: 'userservice__successful-user-login',
  title: 'userservice — auth endpoints: successful login and signup activity spike',
  summary:
    'Elevated but fully successful authentication activity on userservice: successful logins and new account creation, with no errors — benign traffic, not an incident.',
  root_cause: 'Normal load-driven spike in login/signup traffic; all operations succeeded.',
  criticality: 10,
  confidence: 80,
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
  evidences: [
    {
      rule_name: 'Successful user login',
      rule_uuid: 'cbfedad7-d40c-5dde-a84f-d1cba23084b3',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description: 'userservice successful login events — no auth failures observed.',
      esql_query:
        'FROM logs | WHERE resource.attributes.app == "userservice" AND body.text LIKE "*login*" | STATS count = COUNT(*)',
    },
    {
      rule_name: 'New user account created',
      rule_uuid: 'd60afc3c-dac9-51b5-b55d-bfd6c522b269',
      stream_name: 'logs',
      result: 'found',
      row_count: 1,
      description: 'userservice "create_user | Successfully created user" events.',
      esql_query:
        'FROM logs | WHERE resource.attributes.app == "userservice" AND body.text LIKE "*Successfully created user*" | STATS count = COUNT(*)',
    },
  ],
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
      // Mixed batch from the ledger-db-disconnect snapshot: a transactionhistory↔ledger-db SQL
      // connection failure (SQLState 08001) cascading through HikariCP pool init, cache-layer
      // errors, and a frontend→transactionhistory read timeout — alongside BENIGN auth activity
      // (successful logins / new accounts). The investigator must collapse the cascade into one
      // discovery while keeping the benign auth spike as its own separate discovery.
      input: {
        scenario_id: 'ledger-db-disconnect',
        stream_name: 'logs',
        // Terse ground truth — canonicalDetectionsFromGroundTruth stamps the boilerplate.
        // rule_name + rule_uuid match the snapshot's detection KIs verbatim so the investigator
        // resolves them and the rule_name-keyed grouping check lines up across canonical/snapshot.
        detections: [
          {
            kind: 'detection',
            rule_name: 'Transaction history SQL connection failure',
            rule_uuid: '52ad96d3-5d06-5baa-b2de-cd654fbe33f6',
            stream_name: 'logs',
            detection_evidence: { change_point_type: 'spike', p_value: 0.0001 },
          },
          {
            kind: 'detection',
            rule_name: 'HikariCP connection pool initialization',
            rule_uuid: 'f0816e40-c465-563f-91fc-280e23a4ef4e',
            stream_name: 'logs',
            detection_evidence: { change_point_type: 'spike', p_value: 0.0001 },
          },
          {
            kind: 'detection',
            rule_name: 'Transaction history cache errors',
            rule_uuid: 'e2b04e1f-44ed-582f-8e4f-9f62e4706141',
            stream_name: 'logs',
            detection_evidence: { change_point_type: 'spike', p_value: 0.0001 },
          },
          {
            kind: 'detection',
            rule_name: 'Balance reader cache errors',
            rule_uuid: '5961763e-fabc-5bdc-a5fc-aa2c5c4af768',
            stream_name: 'logs',
            detection_evidence: { change_point_type: 'spike', p_value: 0.0001 },
          },
          {
            kind: 'detection',
            rule_name: 'Frontend → transactionhistory read timeout',
            rule_uuid: '1432a71f-0833-55c7-93f4-ac40261e47df',
            stream_name: 'logs',
            detection_evidence: { change_point_type: 'spike', p_value: 0.0001 },
          },
          {
            kind: 'detection',
            rule_name: 'Successful user login',
            rule_uuid: 'cbfedad7-d40c-5dde-a84f-d1cba23084b3',
            stream_name: 'logs',
            detection_evidence: { change_point_type: 'spike', p_value: 0.0001 },
          },
          {
            kind: 'detection',
            rule_name: 'New user account created',
            rule_uuid: 'd60afc3c-dac9-51b5-b55d-bfd6c522b269',
            stream_name: 'logs',
            detection_evidence: { change_point_type: 'spike', p_value: 0.0001 },
          },
        ],
      },
      output: {
        expected_kind: 'discovery',
        // Canonical expected output: the DB-connectivity cascade (all five failure rules share the
        // transactionhistory↔ledger-db root cause) plus the benign auth spike kept separate. Full
        // Discovery shape (detections + evidences + cause_kis) — the same docs the judge consumes.
        // grouping_correctness derives its expected groups from these discoveries' detections.
        expected_discoveries: [LEDGER_DB_CASCADE_DISCOVERY, BENIGN_AUTH_DISCOVERY],
        criteria: [
          {
            id: 'root-cause-sql-connection',
            text: 'Identifies the transactionhistory↔ledger-db SQL connection failure (SQLState 08001 / failed JDBC connections, HikariCP pool init) as the root cause of the failure cascade.',
            score: 3,
          },
          {
            id: 'cascade-grouping',
            text: 'Collapses the SQL connection failure, HikariCP pool init, cache-layer errors (transaction history + balance reader), and the frontend→transactionhistory read timeout into a single cascading discovery rather than separate unrelated incidents.',
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
      // Same cascade, from the judge's side: the investigator's open cascade discovery (the shared
      // canonical doc, carrying detections + evidences + cause_kis — exactly what triage.yaml feeds
      // the judge). The judge should re-verify via search_knowledge_indicators → execute_esql,
      // stamp `confirmed` on the evidences it re-runs, and promote.
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
