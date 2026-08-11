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
const RESULTS_INDEX = 'logs-osquery_manager.result-default';
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

/**
 * Maps each sample query to a function that generates realistic osquery column data.
 * Each generator returns an object with `osquery.*` fields matching what that table produces.
 */
const QUERY_RESULT_GENERATORS: Record<string, () => Record<string, string | number>> = {
  'SELECT * FROM processes;': () => ({
    'osquery.pid': randomInt(1, 65535),
    'osquery.name': randomElement([
      'systemd',
      'sshd',
      'nginx',
      'node',
      'python3',
      'bash',
      'cron',
      'dockerd',
      'kubelet',
      'containerd',
    ]),
    'osquery.path': randomElement([
      '/usr/bin/node',
      '/usr/sbin/sshd',
      '/usr/sbin/nginx',
      '/usr/bin/python3',
      '/bin/bash',
      '/usr/sbin/cron',
      '/usr/bin/dockerd',
      '/usr/bin/kubelet',
    ]),
    'osquery.uid': randomInt(0, 1000),
    'osquery.gid': randomInt(0, 1000),
    'osquery.state': randomElement(['S', 'R', 'D', 'Z', 'T']),
    'osquery.threads': randomInt(1, 64),
    'osquery.resident_size': randomInt(1024, 524288),
    'osquery.total_size': randomInt(2048, 1048576),
    'osquery.cmdline': randomElement([
      '/usr/bin/node /app/server.js',
      '/usr/sbin/sshd -D',
      'nginx: worker process',
      '/usr/bin/python3 /opt/script.py',
      '-bash',
    ]),
  }),

  'SELECT * FROM users;': () => ({
    'osquery.uid': randomInt(0, 65534),
    'osquery.gid': randomInt(0, 65534),
    'osquery.username': randomElement([
      'root',
      'admin',
      'deploy',
      'www-data',
      'nobody',
      'ubuntu',
      'ec2-user',
      'syslog',
    ]),
    'osquery.description': randomElement([
      'root',
      'System Administrator',
      'Deploy User',
      'Web Server',
      'Nobody',
      'Ubuntu',
    ]),
    'osquery.shell': randomElement(['/bin/bash', '/bin/sh', '/usr/sbin/nologin', '/bin/false']),
    'osquery.directory': randomElement(['/root', '/home/admin', '/home/deploy', '/var/www']),
  }),

  'SELECT * FROM os_version;': () => ({
    'osquery.name': randomElement(['Ubuntu', 'CentOS Linux', 'Amazon Linux', 'Debian GNU/Linux']),
    'osquery.version': randomElement(['20.04', '22.04', '7', '8', '2', '11', '12']),
    'osquery.major': randomInt(7, 22),
    'osquery.minor': randomInt(0, 10),
    'osquery.patch': randomInt(0, 5),
    'osquery.platform': 'linux',
    'osquery.platform_like': randomElement(['debian', 'rhel', 'fedora']),
    'osquery.arch': randomElement(['x86_64', 'aarch64']),
  }),

  'SELECT * FROM uptime;': () => ({
    'osquery.days': randomInt(0, 365),
    'osquery.hours': randomInt(0, 23),
    'osquery.minutes': randomInt(0, 59),
    'osquery.seconds': randomInt(0, 59),
    'osquery.total_seconds': randomInt(3600, 31536000),
  }),

  'SELECT * FROM system_info;': () => ({
    'osquery.hostname': `host-${randomElement(['web', 'api', 'db', 'worker', 'cache'])}-${randomInt(
      1,
      50
    )}`,
    'osquery.uuid': uuidv4(),
    'osquery.cpu_type': randomElement(['x86_64', 'aarch64']),
    'osquery.cpu_brand': randomElement([
      'Intel(R) Xeon(R) Platinum 8175M',
      'AMD EPYC 7R13',
      'Intel(R) Core(TM) i7-10700K',
      'Apple M1 Pro',
    ]),
    'osquery.physical_memory': randomElement([
      '4294967296',
      '8589934592',
      '17179869184',
      '34359738368',
    ]),
    'osquery.cpu_logical_cores': randomInt(1, 16),
    'osquery.cpu_physical_cores': randomInt(1, 8),
  }),

  "SELECT pid, name, path FROM processes WHERE name = 'osqueryd';": () => ({
    'osquery.pid': randomInt(1000, 65535),
    'osquery.name': 'osqueryd',
    'osquery.path': '/usr/bin/osqueryd',
  }),

  'SELECT * FROM interface_addresses;': () => ({
    'osquery.interface': randomElement(['eth0', 'ens5', 'lo', 'docker0', 'br-0', 'wlan0']),
    'osquery.address': `${randomElement(['10', '172', '192'])}.${randomInt(0, 255)}.${randomInt(
      0,
      255
    )}.${randomInt(1, 254)}`,
    'osquery.mask': randomElement(['255.255.255.0', '255.255.0.0', '255.0.0.0']),
    'osquery.broadcast': `${randomInt(10, 192)}.${randomInt(0, 255)}.${randomInt(0, 255)}.255`,
    'osquery.type': randomElement(['IPv4', 'IPv6']),
  }),

  'SELECT * FROM listening_ports;': () => ({
    'osquery.pid': randomInt(1, 65535),
    'osquery.port': randomElement([22, 80, 443, 3000, 3306, 5432, 6379, 8080, 8443, 9200, 9300]),
    'osquery.protocol': randomInt(0, 1) === 0 ? 6 : 17,
    'osquery.address': randomElement(['0.0.0.0', '127.0.0.1', '::', '::1']),
    'osquery.family': randomElement([2, 10]),
    'osquery.path': randomElement([
      '/usr/sbin/sshd',
      '/usr/sbin/nginx',
      '/usr/bin/node',
      '/usr/bin/postgres',
    ]),
    'osquery.name': randomElement(['sshd', 'nginx', 'node', 'postgres', 'redis-server']),
  }),

  'SELECT * FROM logged_in_users;': () => ({
    'osquery.user': randomElement(['root', 'admin', 'deploy', 'ubuntu', 'ec2-user']),
    'osquery.type': randomElement(['user', 'login', 'dead']),
    'osquery.tty': randomElement(['pts/0', 'pts/1', 'pts/2', 'tty1', '']),
    'osquery.host': randomElement(['10.0.0.1', '192.168.1.100', 'bastion.example.com', ':0', '']),
    'osquery.pid': randomInt(1, 65535),
    'osquery.time': Math.floor(Date.now() / 1000) - randomInt(0, 86400),
  }),

  'SELECT * FROM routes;': () => ({
    'osquery.destination': randomElement([
      '0.0.0.0',
      '10.0.0.0',
      '172.16.0.0',
      '192.168.0.0',
      '169.254.0.0',
    ]),
    'osquery.netmask': randomInt(0, 32),
    'osquery.gateway': `${randomElement(['10', '172'])}.${randomInt(0, 255)}.${randomInt(
      0,
      255
    )}.1`,
    'osquery.source': '',
    'osquery.interface': randomElement(['eth0', 'ens5', 'docker0']),
    'osquery.metric': randomInt(0, 1000),
    'osquery.type': randomElement(['local', 'remote', 'gateway']),
  }),
};

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
  .option('ruleRatio', {
    alias: 'rr',
    type: 'number',
    default: 0.1,
    description: 'Fraction of actions that are rule-triggered with no user_id (0.0-1.0)',
  })
  .option('batchSize', {
    alias: 'bs',
    type: 'number',
    default: 500,
    description: 'Documents per bulk request',
  })
  .option('results', {
    alias: 'r',
    type: 'boolean',
    default: true,
    description: 'Generate mock result documents in the results index',
  })
  .option('maxResultRows', {
    type: 'number',
    default: 50,
    description: 'Maximum result rows per agent per query (randomized between 1 and this value)',
  })
  .option('scheduledPacks', {
    type: 'number',
    default: 5,
    description: 'Number of simulated scheduled packs',
  })
  .option('scheduledQueriesPerPack', {
    type: 'number',
    default: 5,
    description: 'Queries per scheduled pack',
  })
  .option('scheduledExecutions', {
    type: 'number',
    default: 200,
    description: 'Total execution cycles to generate per query',
  })
  .option('scheduledAgents', {
    type: 'number',
    default: 10,
    description: 'Number of agents reporting per scheduled execution',
  })
  .option('scheduledErrorRate', {
    type: 'number',
    default: 0.05,
    description: 'Fraction of scheduled responses that are errors (0.0-1.0)',
  })
  .option('scheduled', {
    type: 'boolean',
    default: true,
    description: 'Generate scheduled response documents',
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
  ruleRatio,
  delete: deleteFirst,
  deleteOnly,
  es: esUrl,
  kibana: kibanaUrl,
  batchSize,
  results: generateResults,
  maxResultRows,
  scheduledPacks: scheduledPacksCount,
  scheduledQueriesPerPack: scheduledQueriesPerPackCount,
  scheduledExecutions: scheduledExecutionsCount,
  scheduledAgents: scheduledAgentsCount,
  scheduledErrorRate,
  scheduled: generateScheduled,
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
  alert_ids?: string[];
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

interface ScheduledResponseDocument {
  '@timestamp': string;
  action_input_type: 'osquery_scheduled';
  schedule_id: string;
  schedule_execution_count: number;
  response_id: string;
  space_id: string;
  pack_id: string;
  pack_name: string;
  agent: { id: string; name: string; type: string; version: string };
  agent_id: string;
  action_response: { osquery: { count: number } };
  completed_at: string;
  started_at: string;
  error?: string;
}

interface ResultDocument {
  '@timestamp': string;
  action_id: string;
  agent: { name: string; id: string };
  elastic_agent: { id: string };
  event: { ingested: string };
  osquery: Record<string, string | number>;
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
  ruleRatioValue: number;
}): { action: ActionDocument; subQueryActionIds: string[] } {
  const actionId = uuidv4();
  const timestamp = randomTimestampInLastDays(30);
  const expiration = new Date(timestamp.getTime() + 5 * 60 * 1000);
  const numAgents = randomInt(opts.minAgentsPerAction, opts.maxAgentsPerAction);
  const agents = selectRandomAgents(opts.agentPool, numAgents);

  const isAutomated = Math.random() < opts.ruleRatioValue;
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
  } else {
    action.alert_ids = [uuidv4()];
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

function getResultGenerator(query: string): (() => Record<string, string | number>) | null {
  return QUERY_RESULT_GENERATORS[query] ?? null;
}

function generateResultDocuments(
  action: ActionDocument,
  subQueryActionIds: string[],
  responses: ResponseDocument[],
  maxRows: number
): ResultDocument[] {
  const results: ResultDocument[] = [];

  action.queries.forEach((query, queryIndex) => {
    const generator = getResultGenerator(query.query);
    if (!generator) return;

    const subActionId = subQueryActionIds[queryIndex];

    // Group responses by agent for this query's action_id
    const agentResponses = responses.filter((r) => r.action_id === subActionId && !r.error);

    for (const response of agentResponses) {
      const rowCount = Math.min(response.action_response.osquery.count, maxRows);

      for (let row = 0; row < rowCount; row++) {
        const osqueryFields = generator();
        // Strip the 'osquery.' prefix for nested object storage
        const osqueryNested: Record<string, string | number> = {};
        for (const [key, value] of Object.entries(osqueryFields)) {
          const field = key.startsWith('osquery.') ? key.slice('osquery.'.length) : key;
          osqueryNested[field] = value;
        }

        const timestamp = response.completed_at;

        results.push({
          '@timestamp': timestamp,
          action_id: subActionId,
          agent: {
            name: `host-${response.agent_id}`,
            id: response.agent_id,
          },
          elastic_agent: { id: response.agent_id },
          event: { ingested: timestamp },
          osquery: osqueryNested,
        });
      }
    }
  });

  return results;
}

function generateScheduledResponseDocuments(opts: {
  numPacks: number;
  queriesPerPack: number;
  executionsPerQuery: number;
  agentsPerExecution: number;
  errorRateValue: number;
}): { documents: ScheduledResponseDocument[]; totalBuckets: number } {
  const { numPacks, executionsPerQuery, agentsPerExecution, errorRateValue } = opts;
  const documents: ScheduledResponseDocument[] = [];

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const intervalMs = (now - thirtyDaysAgo) / executionsPerQuery;

  const agentPool = Array.from({ length: agentsPerExecution }, (_, i) => ({
    id: `synthetic-scheduled-agent-${i}`,
    name: `scheduled-host-${i}`,
  }));

  let totalBuckets = 0;

  for (let packIdx = 0; packIdx < numPacks; packIdx++) {
    const packId = `scheduled-pack-${packIdx}`;
    const packName = `Scheduled Pack ${packIdx + 1}`;
    const queryScheduleIds = Array.from({ length: opts.queriesPerPack }, () => uuidv4());

    for (let queryIdx = 0; queryIdx < opts.queriesPerPack; queryIdx++) {
      const scheduleId = queryScheduleIds[queryIdx];

      for (let execIdx = 0; execIdx < executionsPerQuery; execIdx++) {
        totalBuckets++;
        const execTimestamp = new Date(
          thirtyDaysAgo + execIdx * intervalMs + Math.random() * intervalMs * 0.1
        );

        for (const agent of agentPool) {
          const startedAt = new Date(execTimestamp.getTime() + randomInt(0, 2) * 1000);
          const completedAt = new Date(startedAt.getTime() + randomInt(1, 10) * 1000);
          const isError = Math.random() < errorRateValue;

          const doc: ScheduledResponseDocument = {
            '@timestamp': completedAt.toISOString(),
            action_input_type: 'osquery_scheduled',
            schedule_id: scheduleId,
            schedule_execution_count: execIdx + 1,
            response_id: uuidv4(),
            space_id: 'default',
            pack_id: packId,
            pack_name: packName,
            agent: {
              id: agent.id,
              name: agent.name,
              type: 'osquerybeat',
              version: '9.4.0',
            },
            agent_id: agent.id,
            action_response: {
              osquery: {
                count: isError ? 0 : randomInt(1, 500),
              },
            },
            started_at: startedAt.toISOString(),
            completed_at: completedAt.toISOString(),
          };

          if (isError) {
            doc.error = randomElement([
              'Query execution timeout',
              'osquery process not running',
              'Agent disconnected',
              'Table not found',
            ]);
          }

          documents.push(doc);
        }
      }
    }
  }

  return { documents, totalBuckets };
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
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const findRes = await fetch(
        `${kbnBaseUrl}/api/cases/_find?tags=${SYNTHETIC_TAG}&owner=${owner}&perPage=100&page=${page}`,
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
        break;
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
      hasMore = caseIds.length === 100;
      page++;
    }
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
          prefix: {
            agents: 'synthetic-agent-',
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

  logger.info('Deleting existing synthetic scheduled responses...');
  try {
    const scheduledRes = await fetch(`${esBaseUrl}/${RESPONSES_INDEX}/_delete_by_query`, {
      method: 'POST',
      headers: {
        Authorization: esAuth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          prefix: {
            agent_id: 'synthetic-scheduled-agent-',
          },
        },
      }),
    });

    const scheduledData = await scheduledRes.json();
    logger.info(`  Deleted ${scheduledData.deleted || 0} scheduled responses`);
  } catch (err) {
    logger.warning(`  Failed to delete scheduled responses: ${err}`);
  }

  logger.info('Deleting existing synthetic results...');
  try {
    const resultsRes = await fetch(`${esBaseUrl}/${RESULTS_INDEX}/_delete_by_query`, {
      method: 'POST',
      headers: {
        Authorization: esAuth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: {
          prefix: {
            'elastic_agent.id': 'synthetic-agent-',
          },
        },
      }),
    });

    const resultsData = await resultsRes.json();
    logger.info(`  Deleted ${resultsData.deleted || 0} results`);
  } catch (err) {
    logger.warning(`  Failed to delete results: ${err}`);
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
}): Promise<{
  actionsIndexed: number;
  responsesIndexed: number;
  resultsIndexed: number;
  actionsWithCases: number;
}> {
  const { totalCount, packCount, users, agentPool, syntheticCases } = opts;

  let actionsIndexed = 0;
  let responsesIndexed = 0;
  let resultsIndexed = 0;
  let actionsWithCases = 0;
  let packIndex = 0;

  let pendingActions: ActionDocument[] = [];
  let pendingResponses: ResponseDocument[] = [];
  let pendingResults: ResultDocument[] = [];

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

  const flushResults = async () => {
    if (pendingResults.length === 0) return;
    const result = await bulkIndex(RESULTS_INDEX, pendingResults, 'Results');
    resultsIndexed += result.success;
    pendingResults = [];
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
      ruleRatioValue: ruleRatio,
    });

    if (action.case_ids && action.case_ids.length > 0) {
      actionsWithCases++;
    }

    pendingActions.push(action);
    const responses = generateResponseDocuments(action, subQueryActionIds, errorRate);
    pendingResponses.push(...responses);

    if (generateResults) {
      const resultDocs = generateResultDocuments(
        action,
        subQueryActionIds,
        responses,
        maxResultRows
      );
      pendingResults.push(...resultDocs);
    }

    if (pendingResponses.length >= batchSize) {
      await flushResponses();
    }

    if (pendingActions.length >= batchSize) {
      await flushActions();
    }

    if (pendingResults.length >= batchSize) {
      await flushResults();
    }
  }

  await flushActions();
  await flushResponses();
  await flushResults();

  return { actionsIndexed, responsesIndexed, resultsIndexed, actionsWithCases };
}

/**
 * The fleet final pipeline unconditionally overwrites event.ingested with "now" on
 * every index/update operation. Since the results and action-results DSLs filter by
 * event.ingested within 30 minutes of the action's @timestamp, synthetic documents
 * would never match actions with past timestamps.
 *
 * To work around this, we temporarily disable both the default and final ingest
 * pipelines on the backing indices, run an _update_by_query to copy @timestamp into
 * event.ingested, then restore the original pipeline settings.
 */
async function fixEventIngestedTimestamps(): Promise<void> {
  const resolveBackingIndices = async (dataStream: string): Promise<string[]> => {
    const res = await fetch(`${esBaseUrl}/_data_stream/${dataStream}`, {
      headers: { Authorization: esAuth },
    });
    const data = await res.json();
    const indices: string[] =
      data.data_streams?.[0]?.indices?.map((i: { index_name: string }) => i.index_name) ?? [];

    return indices;
  };

  const getIndexPipelines = async (
    index: string
  ): Promise<{ defaultPipeline: string; finalPipeline: string }> => {
    const res = await fetch(
      `${esBaseUrl}/${index}/_settings/index.default_pipeline,index.final_pipeline`,
      {
        headers: { Authorization: esAuth },
      }
    );
    const data = await res.json();
    const settings = data[index]?.settings?.index ?? {};

    return {
      defaultPipeline: settings.default_pipeline ?? '_none',
      finalPipeline: settings.final_pipeline ?? '_none',
    };
  };

  const setPipelines = async (index: string, defaultPipeline: string, finalPipeline: string) => {
    await fetch(`${esBaseUrl}/${index}/_settings`, {
      method: 'PUT',
      headers: {
        Authorization: esAuth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'index.default_pipeline': defaultPipeline,
        'index.final_pipeline': finalPipeline,
      }),
    });
  };

  const patchIndex = async (
    dataStream: string,
    identifierField: string,
    prefixes: string[],
    label: string
  ) => {
    logger.info(`  Patching ${label}...`);

    const backingIndices = await resolveBackingIndices(dataStream);
    if (!backingIndices.length) {
      logger.warning(`    No backing indices found for ${dataStream}`);

      return;
    }

    // Save and disable pipelines on all backing indices
    const originalPipelines: Array<{
      index: string;
      defaultPipeline: string;
      finalPipeline: string;
    }> = [];

    for (const index of backingIndices) {
      const pipelines = await getIndexPipelines(index);
      originalPipelines.push({ index, ...pipelines });
      await setPipelines(index, '_none', '_none');
    }

    try {
      const prefixQueries = prefixes.map((p) => ({ prefix: { [identifierField]: p } }));
      const res = await fetch(`${esBaseUrl}/${dataStream}/_update_by_query?conflicts=proceed`, {
        method: 'POST',
        headers: {
          Authorization: esAuth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: {
            bool: {
              should: prefixQueries,
              minimum_should_match: 1,
            },
          },
          script: {
            source: `
              if (ctx._source.event == null) { ctx._source.event = new HashMap(); }
              ctx._source.event.ingested = ctx._source['@timestamp'];
            `,
            lang: 'painless',
          },
        }),
      });

      const data = await res.json();
      logger.info(`    Patched ${data.updated || 0} docs (took ${data.took || 0}ms)`);

      if (data.failures?.length) {
        logger.warning(`    ${data.failures.length} failures`);
      }
    } finally {
      // Restore original pipelines
      for (const { index, defaultPipeline, finalPipeline } of originalPipelines) {
        await setPipelines(index, defaultPipeline, finalPipeline);
      }
    }
  };

  logger.info('Patching event.ingested to match @timestamp on synthetic data...');
  await patchIndex(
    RESPONSES_INDEX,
    'agent_id',
    ['synthetic-agent-', 'synthetic-scheduled-agent-'],
    'action responses'
  );
  await patchIndex(RESULTS_INDEX, 'elastic_agent.id', ['synthetic-agent-'], 'results');
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
  logger.info(`  Rule ratio: ${(ruleRatio * 100).toFixed(0)}%`);
  logger.info(`  Unique users: ${usersCount}`);
  logger.info(
    `  Cases to create: ${casesCount} (attached to ${(caseRatio * 100).toFixed(0)}% of actions)`
  );
  logger.info(
    `  Results: ${
      generateResults ? `enabled (max ${maxResultRows} rows per agent per query)` : 'disabled'
    }`
  );
  logger.info(
    `  Scheduled: ${
      generateScheduled
        ? `enabled (${scheduledPacksCount} packs × ${scheduledQueriesPerPackCount} queries × ${scheduledExecutionsCount} executions × ${scheduledAgentsCount} agents)`
        : 'disabled'
    }`
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

  const { actionsIndexed, responsesIndexed, resultsIndexed, actionsWithCases } =
    await generateAndIndex({
      totalCount: count,
      packCount,
      users,
      agentPool,
      syntheticCases,
    });

  let scheduledResponsesIndexed = 0;
  let scheduledBuckets = 0;

  if (generateScheduled) {
    logger.info('');
    const totalScheduledDocs =
      scheduledPacksCount *
      scheduledQueriesPerPackCount *
      scheduledExecutionsCount *
      scheduledAgentsCount;
    logger.info(
      `Generating ${totalScheduledDocs} scheduled response documents (${scheduledPacksCount} packs × ${scheduledQueriesPerPackCount} queries × ${scheduledExecutionsCount} executions × ${scheduledAgentsCount} agents)...`
    );

    const { documents: scheduledDocs, totalBuckets } = generateScheduledResponseDocuments({
      numPacks: scheduledPacksCount,
      queriesPerPack: scheduledQueriesPerPackCount,
      executionsPerQuery: scheduledExecutionsCount,
      agentsPerExecution: scheduledAgentsCount,
      errorRateValue: scheduledErrorRate,
    });

    scheduledBuckets = totalBuckets;

    const scheduledResult = await bulkIndex(RESPONSES_INDEX, scheduledDocs, 'Scheduled responses');
    scheduledResponsesIndexed = scheduledResult.success;
  }

  // The fleet final pipeline overwrites event.ingested with "now" on all indexed
  // documents. Patch it to match @timestamp so the 30-minute time range filters work.
  logger.info('');
  await fetch(`${esBaseUrl}/${RESPONSES_INDEX},${RESULTS_INDEX}/_refresh`, {
    method: 'POST',
    headers: { Authorization: esAuth },
  });
  await fixEventIngestedTimestamps();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  logger.info('');
  logger.info('================================');
  logger.info(
    `Done! Created ${syntheticCases.length} cases, ${actionsIndexed} actions, ${responsesIndexed} responses, and ${resultsIndexed} results in ${totalTime}s`
  );
  logger.info(`  ${actionsWithCases} actions have case_ids attached`);
  if (generateScheduled) {
    logger.info(
      `  ${scheduledResponsesIndexed} scheduled responses indexed (${scheduledBuckets} unique execution buckets)`
    );
  }
}

run().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
