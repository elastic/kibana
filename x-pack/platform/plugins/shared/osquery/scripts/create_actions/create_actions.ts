/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { ToolingLog } from '@kbn/tooling-log';
import { v4 as uuidv4 } from 'uuid';
import yargs from 'yargs';

const logger = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

const ACTIONS_INDEX = '.logs-osquery_manager.actions-default';
const RESPONSES_INDEX = 'logs-osquery_manager.action.responses-default';
const SYNTHETIC_TAG = 'script_create_actions';
const CASES_API_VERSION = '2023-10-31';
const CASE_CREATION_CONCURRENCY = 10;

const SAMPLE_QUERIES = [
  'SELECT * FROM processes;',
  'SELECT * FROM users;',
  'SELECT * FROM os_version;',
  'SELECT * FROM uptime;',
  'SELECT * FROM system_info;',
  "SELECT pid, name, path FROM processes WHERE name = 'osqueryd';",
  'SELECT * FROM interface_addresses;',
  'SELECT * FROM listening_ports;',
  'SELECT * FROM logged_in_users;',
  'SELECT * FROM routes;',
];

const argv = yargs(process.argv.slice(2))
  .usage('Create synthetic osquery action and response documents for performance testing.')
  .option('count', {
    alias: 'c',
    type: 'number',
    default: 500,
    description: 'Number of action documents to create',
  })
  .option('packRatio', {
    alias: 'pr',
    type: 'number',
    default: 0.2,
    description: 'Fraction of actions that are pack queries (0.0-1.0)',
  })
  .option('queriesPerPack', {
    type: 'number',
    default: 5,
    description: 'Number of sub-queries per pack action',
  })
  .option('minAgents', {
    type: 'number',
    default: 1,
    description: 'Minimum agents per action',
  })
  .option('maxAgents', {
    type: 'number',
    default: 40,
    description: 'Maximum agents per action (randomized between minAgents and this value)',
  })
  .option('errorRate', {
    alias: 'er',
    type: 'number',
    default: 0.25,
    description: 'Fraction of responses that are errors (0.0-1.0)',
  })
  .option('users', {
    alias: 'u',
    type: 'number',
    default: 5,
    description: 'Number of unique synthetic user profiles',
  })
  .option('cases', {
    type: 'number',
    default: 15,
    description: 'Number of real cases to create via Cases API',
  })
  .option('caseRatio', {
    type: 'number',
    default: 0.3,
    description: 'Fraction of actions that have case_ids attached (0.0-1.0)',
  })
  .option('delete', {
    alias: 'd',
    type: 'boolean',
    default: false,
    description: 'Delete previously generated synthetic data first',
  })
  .option('deleteOnly', {
    type: 'boolean',
    default: false,
    description: 'Only delete existing synthetic data, do not create new data',
  })
  .option('es', {
    alias: 'e',
    type: 'string',
    default: 'http://elastic:changeme@127.0.0.1:9200',
    description: 'Elasticsearch URL',
  })
  .option('kibana', {
    alias: 'k',
    type: 'string',
    default: 'http://elastic:changeme@127.0.0.1:5601',
    description: 'Kibana URL (for Cases API)',
  })
  .option('batchSize', {
    alias: 'bs',
    type: 'number',
    default: 500,
    description: 'Documents per bulk request',
  })
  .help().argv;

const {
  count,
  packRatio,
  queriesPerPack,
  minAgents,
  maxAgents,
  errorRate,
  users: usersCount,
  cases: casesCount,
  caseRatio,
  delete: deleteFirst,
  deleteOnly,
  es: esUrl,
  kibana: kibanaUrl,
  batchSize,
} = argv;

function getAuth(rawUrl: string): string {
  const url = new URL(rawUrl);
  const { username, password } = url;

  return (
    'Basic ' + Buffer.from(`${username || 'elastic'}:${password || 'changeme'}`).toString('base64')
  );
}

function getBaseUrl(rawUrl: string): string {
  const url = new URL(rawUrl);

  return `${url.protocol}//${url.host}`;
}

const esAuth = getAuth(esUrl as string);
const esBaseUrl = getBaseUrl(esUrl as string);
const kbnAuth = getAuth(kibanaUrl as string);
const kbnBaseUrl = getBaseUrl(kibanaUrl as string);

interface SyntheticCase {
  id: string;
  title: string;
}

interface SyntheticUser {
  userId: string;
  profileUid: string;
}

interface ActionDocument {
  action_id: string;
  '@timestamp': string;
  expiration: string;
  type: 'INPUT_ACTION';
  input_type: 'osquery';
  agents: string[];
  user_id?: string;
  user_profile_uid?: string;
  case_ids?: string[];
  space_id: string;
  pack_id?: string;
  pack_name?: string;
  metadata: { createdBy: string };
  queries: Array<{
    action_id: string;
    id: string;
    query: string;
    agents: string[];
  }>;
}

interface ResponseDocument {
  '@timestamp': string;
  action_id: string;
  action_input_type: 'osquery';
  agent_id: string;
  action_data: {
    id: string;
    query: string;
  };
  action_response: {
    osquery: {
      count: number;
    };
  };
  error?: string;
  completed_at: string;
  started_at: string;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTimestampInLastDays(days: number): Date {
  const now = Date.now();
  const daysAgo = now - days * 24 * 60 * 60 * 1000;

  return new Date(daysAgo + Math.random() * (now - daysAgo));
}

function generateUsers(numUsers: number): SyntheticUser[] {
  return Array.from({ length: numUsers }, (_, i) => ({
    userId: `synthetic-user-${i}`,
    profileUid: `u_synthetic_profile_${i}_0`,
  }));
}

function generateAgentPool(poolSize: number): string[] {
  return Array.from({ length: poolSize }, (_, i) => `synthetic-agent-${i}`);
}

function selectRandomAgents(pool: string[], numAgents: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, Math.min(numAgents, pool.length));
}

function generateActionDocument(opts: {
  isPack: boolean;
  users: SyntheticUser[];
  agentPool: string[];
  minAgentsPerAction: number;
  maxAgentsPerAction: number;
  numQueriesPerPack: number;
  packIndex: number;
  syntheticCases: SyntheticCase[];
  caseRatioValue: number;
}): { action: ActionDocument; subQueryActionIds: string[] } {
  const actionId = uuidv4();
  const timestamp = randomTimestampInLastDays(30);
  const expiration = new Date(timestamp.getTime() + 5 * 60 * 1000);
  const numAgents = randomInt(opts.minAgentsPerAction, opts.maxAgentsPerAction);
  const agents = selectRandomAgents(opts.agentPool, numAgents);

  const isAutomated = Math.random() < 0.1;
  const user = isAutomated ? null : randomElement(opts.users);

  const numQueries = opts.isPack ? opts.numQueriesPerPack : 1;
  const subQueryActionIds: string[] = [];

  const queries = Array.from({ length: numQueries }, (_, i) => {
    const subActionId = uuidv4();
    subQueryActionIds.push(subActionId);

    return {
      action_id: subActionId,
      id: opts.isPack ? `pack-query-${i}` : uuidv4(),
      query: randomElement(SAMPLE_QUERIES),
      agents,
    };
  });

  const action: ActionDocument = {
    action_id: actionId,
    '@timestamp': timestamp.toISOString(),
    expiration: expiration.toISOString(),
    type: 'INPUT_ACTION',
    input_type: 'osquery',
    agents,
    space_id: 'default',
    metadata: { createdBy: SYNTHETIC_TAG },
    queries,
  };

  if (user) {
    action.user_id = user.userId;
    action.user_profile_uid = user.profileUid;
  }

  if (opts.syntheticCases.length > 0 && Math.random() < opts.caseRatioValue) {
    const numCasesToAttach = randomInt(1, Math.min(3, opts.syntheticCases.length));
    const shuffledCases = [...opts.syntheticCases].sort(() => Math.random() - 0.5);
    action.case_ids = shuffledCases.slice(0, numCasesToAttach).map((c) => c.id);
  }

  if (opts.isPack) {
    action.pack_id = `pack-${uuidv4()}`;
    action.pack_name = `Performance Test Pack ${opts.packIndex}`;
  }

  return { action, subQueryActionIds };
}

function generateResponseDocuments(
  action: ActionDocument,
  subQueryActionIds: string[],
  errorRateValue: number
): ResponseDocument[] {
  const responses: ResponseDocument[] = [];
  const actionTimestamp = new Date(action['@timestamp']);

  action.queries.forEach((query, queryIndex) => {
    action.agents.forEach((agentId) => {
      const startedAt = new Date(actionTimestamp.getTime() + randomInt(1, 5) * 1000);
      const completedAt = new Date(startedAt.getTime() + randomInt(1, 30) * 1000);
      const isError = Math.random() < errorRateValue;

      const response: ResponseDocument = {
        '@timestamp': completedAt.toISOString(),
        action_id: subQueryActionIds[queryIndex],
        action_input_type: 'osquery',
        agent_id: agentId,
        action_data: {
          id: query.id,
          query: query.query,
        },
        action_response: {
          osquery: {
            count: isError ? 0 : randomInt(1, 500),
          },
        },
        started_at: startedAt.toISOString(),
        completed_at: completedAt.toISOString(),
      };

      if (isError) {
        response.error = randomElement([
          'Query execution timeout',
          'osquery process not running',
          'Agent disconnected',
          'Query syntax error',
        ]);
      }

      responses.push(response);
    });
  });

  return responses;
}

async function createSingleCase(index: number): Promise<SyntheticCase | null> {
  const res = await fetch(`${kbnBaseUrl}/api/cases`, {
    method: 'POST',
    headers: {
      Authorization: kbnAuth,
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      'Elastic-Api-Version': CASES_API_VERSION,
    },
    body: JSON.stringify({
      title: `Synthetic Case ${index + 1}`,
      description: `Synthetic case created by ${SYNTHETIC_TAG} for performance testing.`,
      tags: [SYNTHETIC_TAG],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: true },
      owner: 'securitySolution',
    }),
  });

  const data = await res.json();

  if (data.id) {
    return { id: data.id, title: data.title };
  }

  logger.warning(`  Failed to create case ${index + 1}: ${JSON.stringify(data)}`);

  return null;
}

async function createCases(numCases: number): Promise<SyntheticCase[]> {
  const cases: SyntheticCase[] = [];
  const indices = Array.from({ length: numCases }, (_, i) => i);

  for (let i = 0; i < indices.length; i += CASE_CREATION_CONCURRENCY) {
    const chunk = indices.slice(i, i + CASE_CREATION_CONCURRENCY);
    const results = await Promise.all(chunk.map((idx) => createSingleCase(idx)));

    for (const result of results) {
      if (result) {
        cases.push(result);
      }
    }
  }

  return cases;
}

async function deleteSyntheticCases(): Promise<number> {
  const owners = ['securitySolution', 'cases', 'observability'];
  let totalDeleted = 0;

  for (const owner of owners) {
    const findRes = await fetch(
      `${kbnBaseUrl}/api/cases/_find?tags=${SYNTHETIC_TAG}&owner=${owner}&perPage=1000`,
      {
        method: 'GET',
        headers: {
          Authorization: kbnAuth,
          'Elastic-Api-Version': CASES_API_VERSION,
        },
      }
    );

    const findData = await findRes.json();
    const caseIds: string[] = findData.cases?.map((c: { id: string }) => c.id) || [];

    if (caseIds.length === 0) {
      continue;
    }

    const idsParam = caseIds.map((id) => `ids=${id}`).join('&');
    await fetch(`${kbnBaseUrl}/api/cases?${idsParam}`, {
      method: 'DELETE',
      headers: {
        Authorization: kbnAuth,
        'kbn-xsrf': 'true',
        'Elastic-Api-Version': CASES_API_VERSION,
      },
    });

    totalDeleted += caseIds.length;
  }

  return totalDeleted;
}

async function deleteExistingData(): Promise<void> {
  logger.info('Deleting existing synthetic cases...');
  try {
    const deletedCases = await deleteSyntheticCases();
    logger.info(`  Deleted ${deletedCases} cases`);
  } catch (err) {
    logger.warning(`  Failed to delete cases: ${err}`);
  }

  logger.info('Deleting existing synthetic actions...');
  try {
    const actionsRes = await fetch(`${esBaseUrl}/${ACTIONS_INDEX}/_delete_by_query`, {
      method: 'POST',
      headers: {
        Authorization: esAuth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              { term: { type: 'INPUT_ACTION' } },
              { term: { input_type: 'osquery' } },
              { term: { 'metadata.createdBy': SYNTHETIC_TAG } },
            ],
          },
        },
      }),
    });

    const actionsData = await actionsRes.json();
    logger.info(`  Deleted ${actionsData.deleted || 0} actions`);
  } catch (err) {
    logger.warning(`  Failed to delete actions: ${err}`);
  }

  logger.info('Deleting existing synthetic responses...');
  try {
    const responsesRes = await fetch(`${esBaseUrl}/${RESPONSES_INDEX}/_delete_by_query`, {
      method: 'POST',
      headers: {
        Authorization: esAuth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          prefix: {
            agent_id: 'synthetic-agent-',
          },
        },
      }),
    });

    const responsesData = await responsesRes.json();
    logger.info(`  Deleted ${responsesData.deleted || 0} responses`);
  } catch (err) {
    logger.warning(`  Failed to delete responses: ${err}`);
  }
}

async function bulkIndex(
  index: string,
  documents: object[],
  label: string
): Promise<{ success: number; errors: number; took: number }> {
  let totalSuccess = 0;
  let totalErrors = 0;
  let totalTook = 0;

  const batches = Math.ceil(documents.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, documents.length);
    const batch = documents.slice(start, end);

    const body =
      batch.flatMap((doc) => ['{ "create": {} }', JSON.stringify(doc)]).join('\n') + '\n';

    const res = await fetch(`${esBaseUrl}/${index}/_bulk`, {
      method: 'POST',
      headers: {
        Authorization: esAuth,
        'Content-Type': 'application/x-ndjson',
      },
      body,
    });

    const data = await res.json();

    if (data.errors) {
      const errorItems =
        data.items?.filter((item: { create?: { error?: unknown } }) => item.create?.error) || [];
      totalErrors += errorItems.length;
      totalSuccess += batch.length - errorItems.length;
      if (errorItems.length > 0) {
        logger.warning(`  Batch ${i + 1}/${batches}: ${errorItems.length} errors`);
        logger.warning(`    Sample error: ${JSON.stringify(errorItems[0]?.create?.error)}`);
      }
    } else {
      totalSuccess += batch.length;
    }

    totalTook += data.took || 0;
    logger.info(
      `  ${label} batch ${i + 1}/${batches}: ${batch.length} docs, took ${data.took || 0}ms`
    );
  }

  return { success: totalSuccess, errors: totalErrors, took: totalTook };
}

async function generateAndIndex(opts: {
  totalCount: number;
  packCount: number;
  users: SyntheticUser[];
  agentPool: string[];
  syntheticCases: SyntheticCase[];
}): Promise<{ actionsIndexed: number; responsesIndexed: number; actionsWithCases: number }> {
  const { totalCount, packCount, users, agentPool, syntheticCases } = opts;

  let actionsIndexed = 0;
  let responsesIndexed = 0;
  let actionsWithCases = 0;
  let packIndex = 0;

  let pendingActions: ActionDocument[] = [];
  let pendingResponses: ResponseDocument[] = [];

  const flushResponses = async () => {
    if (pendingResponses.length === 0) return;
    const result = await bulkIndex(RESPONSES_INDEX, pendingResponses, 'Responses');
    responsesIndexed += result.success;
    pendingResponses = [];
  };

  const flushActions = async () => {
    if (pendingActions.length === 0) return;
    const result = await bulkIndex(ACTIONS_INDEX, pendingActions, 'Actions');
    actionsIndexed += result.success;
    pendingActions = [];
  };

  for (let i = 0; i < totalCount; i++) {
    const isPack = i < packCount;
    const { action, subQueryActionIds } = generateActionDocument({
      isPack,
      users,
      agentPool,
      minAgentsPerAction: minAgents,
      maxAgentsPerAction: maxAgents,
      numQueriesPerPack: queriesPerPack,
      packIndex: isPack ? packIndex++ : 0,
      syntheticCases,
      caseRatioValue: caseRatio,
    });

    if (action.case_ids && action.case_ids.length > 0) {
      actionsWithCases++;
    }

    pendingActions.push(action);
    const responses = generateResponseDocuments(action, subQueryActionIds, errorRate);
    pendingResponses.push(...responses);

    if (pendingResponses.length >= batchSize) {
      await flushResponses();
    }

    if (pendingActions.length >= batchSize) {
      await flushActions();
    }
  }

  await flushActions();
  await flushResponses();

  return { actionsIndexed, responsesIndexed, actionsWithCases };
}

async function run(): Promise<void> {
  logger.info('Osquery Synthetic Data Generator');
  logger.info('================================');
  logger.info(`  Actions to create: ${count}`);
  logger.info(`  Pack ratio: ${(packRatio * 100).toFixed(0)}%`);
  logger.info(`  Queries per pack: ${queriesPerPack}`);
  logger.info(
    `  Agents per action: ${minAgents}-${maxAgents}${
      minAgents === maxAgents ? ' (fixed)' : ' (randomized)'
    }`
  );
  logger.info(`  Error rate: ${(errorRate * 100).toFixed(0)}%`);
  logger.info(`  Unique users: ${usersCount}`);
  logger.info(
    `  Cases to create: ${casesCount} (attached to ${(caseRatio * 100).toFixed(0)}% of actions)`
  );
  logger.info(`  Elasticsearch: ${esBaseUrl}`);
  logger.info(`  Kibana: ${kbnBaseUrl}`);
  logger.info('');

  if (deleteFirst || deleteOnly) {
    await deleteExistingData();
    logger.info('');

    if (deleteOnly) {
      logger.info('================================');
      logger.info('Delete only mode - no new data created');

      return;
    }
  }

  logger.info(`Creating ${casesCount} cases via Kibana API...`);
  const syntheticCases = await createCases(casesCount);
  logger.info(`  Created ${syntheticCases.length} cases`);
  logger.info('');

  const users = generateUsers(usersCount);
  const agentPool = generateAgentPool(Math.max(maxAgents, 10));

  const packCount = Math.floor(count * packRatio);
  const singleCount = count - packCount;

  logger.info(
    `Generating and indexing ${count} actions (${packCount} packs, ${singleCount} single queries)...`
  );

  const startTime = Date.now();

  const { actionsIndexed, responsesIndexed, actionsWithCases } = await generateAndIndex({
    totalCount: count,
    packCount,
    users,
    agentPool,
    syntheticCases,
  });

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  logger.info('');
  logger.info('================================');
  logger.info(
    `Done! Created ${syntheticCases.length} cases, ${actionsIndexed} actions, and ${responsesIndexed} responses in ${totalTime}s`
  );
  logger.info(`  ${actionsWithCases} actions have case_ids attached`);
}

run().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
