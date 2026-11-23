/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seeds cases so that the "What is new since your last visit" view of Cases shows data.
 *
 *   node x-pack/platform/plugins/shared/cases/scripts/seed_delta_view.js [options]
 *
 * The script:
 *   1. Seeds endpoints and alerts with the existing scripts, when the stack has too few
 *      (`endpoint_agent_emulator.js --asSuperuser` and `generate_cli.js ... --attacks`).
 *   2. Creates the role case_delta_role (Cases, alerts and connectors access, no superuser)
 *      and the user case_delta_user with that role. This user works on the cases.
 *   3. Creates cases from the seeded alerts as case_delta_user, with a first batch of activity.
 *   4. Marks each case as seen for the admin user, case_delta_user and any --reader users.
 *   5. Lets case_delta_user add a second batch: alerts, comments, observables, status and
 *      severity.
 *
 * Log in as the admin user (elastic) or as a --reader user to see the view on each case. The
 * user that made the changes (case_delta_user) does not see its own changes as new.
 * Needs Node 22 or later (global `fetch`) and a running Elasticsearch and Kibana.
 */

const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');
const { parseArgs } = require('node:util');
const { spawn } = require('node:child_process');
const seedrandom = require('seedrandom');

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const SECURITY_SCRIPTS = path.join(
  REPO_ROOT,
  'x-pack/solutions/security/plugins/security_solution/scripts'
);
const ENDPOINT_EMULATOR = path.join(SECURITY_SCRIPTS, 'endpoint/endpoint_agent_emulator.js');
const DATA_GENERATOR = path.join(SECURITY_SCRIPTS, 'data/generate_cli.js');

const TAG = 'delta-view-poc';
const OWNER = 'securitySolution';
const SEVERITY_RANK = ['low', 'medium', 'high', 'critical'];
const MIN_HOSTS_WITH_ALERTS_FOR_AUTO_SEED = 3;
const ROLE_NAME = 'case_delta_role';
// Users of earlier versions of this script. Cleanup removes them too.
const LEGACY_USERS = ['delta_actor', 'delta_analyst'];

const { values: options } = parseArgs({
  options: {
    kibana: { type: 'string', default: 'http://127.0.0.1:5601' },
    elasticsearch: { type: 'string', default: 'http://127.0.0.1:9200' },
    username: { type: 'string', default: 'elastic' },
    password: { type: 'string', default: 'changeme' },
    space: { type: 'string', default: 'default' },
    actor: { type: 'string', default: 'case_delta_user' },
    'actor-password': { type: 'string', default: 'case-delta-pass' },
    cases: { type: 'string' },
    'alerts-per-case': { type: 'string' },
    'random-seed': { type: 'string' },
    reader: { type: 'string', multiple: true, default: [] },
    seed: { type: 'string', default: 'auto' },
    'emulator-seconds': { type: 'string', default: '120' },
    cleanup: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

const HELP = `
Seeds cases so that the "What is new since your last visit" view shows data.

  node x-pack/platform/plugins/shared/cases/scripts/seed_delta_view.js [options]

Options:
  --kibana <url>               Default http://127.0.0.1:5601
  --elasticsearch <url>        Default http://127.0.0.1:9200
  --username <name>            Admin user. Also a reader of the cases. Default elastic
  --password <password>        Default changeme
  --space <id>                 Kibana space. Default default
  --actor <name>               New user, with the role case_delta_role, that works on the
                               cases. Default case_delta_user
  --actor-password <value>     Default case-delta-pass
  --cases <n>                  Number of cases. Default: random, 1 to 3
  --alerts-per-case <n>        Alerts for each case, at least 2. Default: random, 3 to 6
  --reader <name:password>     Also prepare an existing user, for example the one you log in with.
                               Repeat the option for more users. The script needs the password,
                               because the marker belongs to the user who calls the API
  --random-seed <text>         Repeat the random choices of an earlier run. The script prints
                               the seed it used
  --seed <mode>                auto: seed only when the stack has too little data (default)
                               always: always run both seeding scripts
                               never: never run the seeding scripts
  --emulator-seconds <n>       Longest time to let the endpoint emulator run. Default 120
  --cleanup                    Delete the cases tagged "${TAG}", the new user and the new role
  --dry-run                    Print what would run. Change nothing
  --help                       Show this text
`;

/* -------------------------------- randomness ------------------------------- */

const RANDOM_SEED = options['random-seed'] ?? randomBytes(4).toString('hex');

// Seeded, so a run can be repeated with --random-seed.
const random = seedrandom(RANDOM_SEED);
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (list) => list[Math.floor(random() * list.length)];
const shuffle = (list) => {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
};
const pickMany = (list, count) => shuffle(list).slice(0, count);

const parseWholeNumber = (value, name, minimum) => {
  if (value === undefined) return undefined;
  const number = Number.parseInt(value, 10);
  if (!Number.isInteger(number) || number < minimum) {
    throw new Error(`--${name} must be a whole number of at least ${minimum}`);
  }
  return number;
};

const FIXED_CASE_COUNT = parseWholeNumber(options.cases, 'cases', 1);
const FIXED_ALERTS_PER_CASE = parseWholeNumber(options['alerts-per-case'], 'alerts-per-case', 2);
const MIN_ALERTS_PER_CASE = FIXED_ALERTS_PER_CASE ?? 3;
const MAX_ALERTS_PER_CASE = FIXED_ALERTS_PER_CASE ?? 6;
const CASE_COUNT = FIXED_CASE_COUNT ?? between(1, 3);

const SPACE_PREFIX = options.space === 'default' ? '' : `/s/${options.space}`;
const ALERTS_INDEX = `.alerts-security.alerts-${options.space}`;
const KIBANA = options.kibana.replace(/\/$/, '');
const ELASTICSEARCH = options.elasticsearch.replace(/\/$/, '');

const parseReader = (value) => {
  const separator = value.indexOf(':');
  if (separator < 1 || separator === value.length - 1) {
    throw new Error(`--reader must look like name:password, got "${value}"`);
  }
  return { username: value.slice(0, separator), password: value.slice(separator + 1) };
};

const admin = { username: options.username, password: options.password };
const actor = { username: options.actor, password: options['actor-password'] };
const extraReaders = options.reader.map(parseReader);

const log = (message) => console.log(`[seed] ${message}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const basicAuth = ({ username, password }) =>
  `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

const request = async (url, { user, method = 'GET', body }) => {
  const response = await fetch(url, {
    method,
    headers: {
      authorization: basicAuth(user),
      'content-type': 'application/json',
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'Kibana',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${url} failed with ${response.status}: ${text.slice(0, 400)}`);
  }
  return text.length > 0 ? JSON.parse(text) : {};
};

const es = (user, apiPath, init = {}) => request(`${ELASTICSEARCH}${apiPath}`, { user, ...init });
const kbn = (user, apiPath, init = {}) =>
  request(`${KIBANA}${SPACE_PREFIX}${apiPath}`, { user, ...init });

/* ---------------------------------- users ---------------------------------- */

// Cases, alerts and connectors access, and read access to the alert indices. No superuser.
const ensureRole = async () => {
  await request(`${KIBANA}/api/security/role/${ROLE_NAME}`, {
    user: admin,
    method: 'PUT',
    body: {
      elasticsearch: {
        cluster: [],
        indices: [
          {
            names: ['.alerts-security.alerts-*', '.internal.alerts-security.alerts-*'],
            privileges: ['read', 'view_index_metadata'],
          },
        ],
      },
      kibana: [
        {
          base: [],
          feature: {
            securitySolutionCasesV3: ['all'],
            siemV5: ['read'],
            securitySolutionRulesV4: ['read'],
            securitySolutionAlertsV1: ['read'],
            actions: ['read'],
          },
          spaces: [options.space],
        },
      ],
    },
  });
  log(`Role ${ROLE_NAME} is ready.`);
};

const ensureUser = async ({ username, password }, fullName) => {
  await es(admin, `/_security/user/${encodeURIComponent(username)}`, {
    method: 'PUT',
    body: { password, roles: [ROLE_NAME], full_name: fullName },
  });
  // The marker is keyed by the profile ID. Activate the profile now, so the marker we write
  // over the API is the same one the browser session uses after the user logs in.
  await es(admin, '/_security/profile/_activate', {
    method: 'POST',
    body: { grant_type: 'password', username, password },
  });
  log(`User ${username} is ready (role ${ROLE_NAME}).`);
};

const deleteUser = async ({ username }, { quiet = false } = {}) => {
  try {
    await es(admin, `/_security/user/${encodeURIComponent(username)}`, { method: 'DELETE' });
    log(`Deleted user ${username}.`);
  } catch (error) {
    if (!quiet) log(`Could not delete user ${username}: ${error.message}`);
  }
};

/* --------------------------------- seeding --------------------------------- */

const countOf = async (indexPattern) => {
  try {
    const { count } = await es(admin, `/${indexPattern}/_count`);
    return count;
  } catch {
    return 0;
  }
};

const hostsWithAlerts = async () => {
  try {
    const result = await es(admin, `/${ALERTS_INDEX}/_search`, {
      method: 'POST',
      body: {
        size: 0,
        aggs: {
          hosts: {
            terms: { field: 'host.name', size: 50, min_doc_count: MIN_ALERTS_PER_CASE },
          },
        },
      },
    });
    return result.aggregations.hosts.buckets.map(({ key }) => key);
  } catch {
    return [];
  }
};

const runScript = ({ label, script, args, stopWhen, maxMs }) =>
  new Promise((resolve) => {
    log(`Running ${label}: node ${path.relative(REPO_ROOT, script)} ${args.join(' ')}`);
    const child = spawn(process.execPath, [script, ...args], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    let finished = false;
    const finish = (reason) => {
      if (finished) return;
      finished = true;
      clearInterval(poll);
      clearTimeout(limit);
      log(`${label} ${reason}.`);
      resolve();
    };
    const stop = (reason) => {
      if (finished) return;
      child.kill('SIGINT');
      setTimeout(() => child.kill('SIGKILL'), 10_000).unref();
      finish(reason);
    };
    const poll = setInterval(async () => {
      if (stopWhen && (await stopWhen())) stop('stopped: the data is there');
    }, 5_000);
    const limit = setTimeout(() => stop('stopped: time limit'), maxMs);
    child.on('exit', (code) => finish(`exited with code ${code}`));
  });

const seedEndpoints = async () => {
  const before = await countOf('metrics-endpoint.metadata-*');
  await runScript({
    label: 'the endpoint emulator',
    script: ENDPOINT_EMULATOR,
    args: [
      '--asSuperuser',
      '--username',
      admin.username,
      '--password',
      admin.password,
      '--kibana',
      KIBANA,
      '--elasticsearch',
      ELASTICSEARCH,
    ],
    maxMs: Number.parseInt(options['emulator-seconds'], 10) * 1000,
    stopWhen: async () => (await countOf('metrics-endpoint.metadata-*')) > before,
  });
};

const seedAlerts = () =>
  runScript({
    label: 'the data generator',
    script: DATA_GENERATOR,
    args: [
      '-n',
      '500',
      '-h',
      '22',
      '-u',
      '23',
      '--start-date',
      '1d',
      '--end-date',
      'now',
      '--attacks',
      '--username',
      admin.username,
      '--password',
      admin.password,
      '--kibanaUrl',
      KIBANA,
      '--elasticsearchUrl',
      ELASTICSEARCH,
      ...(options.space === 'default' ? [] : ['--spaceId', options.space]),
    ],
    maxMs: 30 * 60 * 1000,
  });

const seedIfNeeded = async () => {
  if (options.seed === 'never') {
    return;
  }
  const alwaysSeed = options.seed === 'always';
  const endpointCount = await countOf('metrics-endpoint.metadata-*');
  const hosts = await hostsWithAlerts();
  log(`Found ${endpointCount} endpoint documents and ${hosts.length} hosts with enough alerts.`);

  if (alwaysSeed || endpointCount === 0) {
    await seedEndpoints();
  }
  if (alwaysSeed || hosts.length < Math.max(CASE_COUNT, MIN_HOSTS_WITH_ALERTS_FOR_AUTO_SEED)) {
    await seedAlerts();
  }
};

/* --------------------------------- alerts ---------------------------------- */

const pickAlertsByHost = async () => {
  const { hits } = await es(admin, `/${ALERTS_INDEX}/_search`, {
    method: 'POST',
    body: {
      size: 1000,
      sort: [{ '@timestamp': 'desc' }],
      query: { exists: { field: 'host.name' } },
      _source: [
        'host.name',
        'host.ip',
        'kibana.alert.rule.uuid',
        'kibana.alert.rule.name',
        'kibana.alert.severity',
      ],
    },
  });

  const byHost = new Map();
  for (const hit of hits.hits) {
    const source = hit._source;
    const host = source.host.name;
    const alert = {
      id: hit._id,
      index: hit._index,
      ruleId: source['kibana.alert.rule.uuid'] ?? 'unknown',
      ruleName: source['kibana.alert.rule.name'] ?? 'Unknown rule',
      severity: source['kibana.alert.severity'] ?? 'medium',
      ips: [source.host.ip].flat().filter(Boolean),
    };
    byHost.set(host, [...(byHost.get(host) ?? []), alert]);
  }

  const eligible = [...byHost.entries()].filter(
    ([, alerts]) => alerts.length >= MIN_ALERTS_PER_CASE
  );

  return shuffle(eligible)
    .slice(0, CASE_COUNT)
    .map(([host, alerts]) => ({
      host,
      alerts: shuffle(alerts).slice(
        0,
        between(MIN_ALERTS_PER_CASE, Math.min(MAX_ALERTS_PER_CASE, alerts.length))
      ),
    }));
};

/* ---------------------------------- cases ---------------------------------- */

const TITLES = [
  (host) => `Suspicious activity on ${host}`,
  (host) => `Possible malware on ${host}`,
  (host) => `Unusual process behavior on ${host}`,
  (host) => `Credential access attempt on ${host}`,
  (host) => `Lateral movement from ${host}`,
  (host) => `Endpoint alerts cluster on ${host}`,
];

const FIRST_COMMENTS = [
  (host) => `First look at ${host}. Attached the first alerts.`,
  (host) => `Started triage on ${host}. These alerts came in first.`,
  (host) => `Picked this up from the queue. ${host} raised the first alerts.`,
];

const FOLLOW_UP_COMMENTS = [
  (host) => `Isolating ${host} now. Pulling a memory image next.`,
  (host) => `Asked the owner of ${host} about the activity.`,
  () => 'The owner says the script was not theirs.',
  () => 'The process tree shows credential access from a script host.',
  () => 'Escalating to the incident lead.',
  () => 'More alerts from the same endpoint arrived.',
  () => 'Checked the parent process. It started from a scheduled task.',
  () => 'No sign of data leaving the network so far.',
  (host) => `Compared ${host} with other endpoints. Only this one shows the pattern.`,
  () => 'Collected the dropped file for analysis.',
];

const highestSeverity = (alerts) =>
  alerts.reduce(
    (highest, { severity }) =>
      SEVERITY_RANK.indexOf(severity) > SEVERITY_RANK.indexOf(highest) ? severity : highest,
    'low'
  );

const createCase = (host, alerts) =>
  kbn(actor, '/api/cases', {
    method: 'POST',
    body: {
      title: pick(TITLES)(host),
      description: `Alerts from the endpoint **${host}**. Seeded by \`seed_delta_view.js\`.`,
      tags: [TAG, 'seeded'],
      owner: OWNER,
      severity: highestSeverity(alerts),
      settings: { syncAlerts: false },
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
    },
  });

const addComment = (caseId, text) =>
  kbn(actor, `/api/cases/${caseId}/comments`, {
    method: 'POST',
    body: { type: 'user', comment: text, owner: OWNER },
  });

const attachAlert = (caseId, alert) =>
  kbn(actor, `/api/cases/${caseId}/comments`, {
    method: 'POST',
    body: {
      type: 'alert',
      alertId: alert.id,
      index: alert.index,
      rule: { id: alert.ruleId, name: alert.ruleName },
      owner: OWNER,
    },
  });

// Cases extracts observables from attached alerts, so a value can already exist.
const addObservable = async (caseId, typeKey, value, description) => {
  try {
    await kbn(actor, `/internal/cases/${caseId}/observables`, {
      method: 'POST',
      body: { observable: { typeKey, value, description } },
    });
  } catch (error) {
    if (!error.message.includes('duplicated observables')) {
      throw error;
    }
  }
};

const uniqueFileHash = (host) =>
  createHash('sha256').update(`${host}:${Date.now()}:${Math.random()}`).digest('hex');

// A random value can equal the current one, and the API rejects an update without a change.
const updateCase = async (caseId, changes) => {
  const current = await kbn(actor, `/api/cases/${caseId}`);
  const effective = Object.fromEntries(
    Object.entries(changes).filter(([field, value]) => current[field] !== value)
  );
  if (Object.keys(effective).length === 0) {
    return;
  }
  await kbn(actor, '/api/cases', {
    method: 'PATCH',
    body: { cases: [{ id: caseId, version: current.version, ...effective }] },
  });
};

const markAsSeen = (user, caseId) =>
  kbn(user, `/internal/cases/${caseId}/delta/_viewed`, {
    method: 'POST',
    body: { markSeen: true },
  });

const addFollowUpComments = async (caseId, host, count) => {
  for (const write of pickMany(FOLLOW_UP_COMMENTS, count)) {
    await addComment(caseId, write(host));
  }
};

/**
 * What the actor does after the readers have seen the case. A run picks the scenarios in a
 * random order and the details inside each one at random, so the view shows different counts
 * and detail lines every time.
 */
const SCENARIOS = [
  async (caseId, { host, newAlerts, ips }) => {
    await addFollowUpComments(caseId, host, between(1, 3));
    for (const alert of newAlerts) await attachAlert(caseId, alert);
    await addObservable(caseId, 'observable-type-hostname', host, 'Affected endpoint');
    if (ips.length > 0) {
      await addObservable(caseId, 'observable-type-ipv4', pick(ips), 'Endpoint address');
    }
    await addObservable(
      caseId,
      'observable-type-file-hash',
      uniqueFileHash(host),
      'Hash of the dropped script'
    );
    await updateCase(caseId, { severity: pick(['high', 'critical']), status: 'in-progress' });
  },
  async (caseId, { host }) => {
    await addFollowUpComments(caseId, host, between(2, 4));
    await updateCase(caseId, { status: pick(['in-progress', 'in-progress', 'closed']) });
  },
  async (caseId, { host, newAlerts }) => {
    for (const alert of newAlerts) await attachAlert(caseId, alert);
    await addFollowUpComments(caseId, host, 1);
  },
  async (caseId, { host }) => {
    await addObservable(
      caseId,
      'observable-type-file-hash',
      uniqueFileHash(host),
      'Hash of the dropped script'
    );
    await updateCase(caseId, { severity: pick(['medium', 'high', 'critical']) });
  },
];

const seedCase = async ({ host, alerts }, index, scenarioIndex, readers) => {
  const split = Math.max(1, Math.floor(alerts.length / 2));
  const oldAlerts = alerts.slice(0, split);
  const newAlerts = alerts.slice(split);

  const created = await createCase(host, alerts);
  log(`Case ${index + 1}: ${created.title} (${created.id}), scenario ${scenarioIndex + 1}`);

  // First batch: the readers have not seen the case yet, and it does not count as new.
  for (const alert of oldAlerts) await attachAlert(created.id, alert);
  await addComment(created.id, pick(FIRST_COMMENTS)(host));

  for (const reader of readers) {
    await markAsSeen(reader, created.id);
  }
  // The window starts at the mark. Wait so the new activity gets a later timestamp.
  await sleep(1500);

  const ips = [...new Set(alerts.flatMap((alert) => alert.ips))];
  await SCENARIOS[scenarioIndex](created.id, { host, newAlerts, ips });

  return created;
};

/* --------------------------------- cleanup --------------------------------- */

const cleanup = async () => {
  const found = await kbn(admin, `/api/cases/_find?tags=${TAG}&perPage=100`);
  const ids = found.cases.map(({ id }) => id);
  if (ids.length > 0) {
    await kbn(admin, `/api/cases?ids=${encodeURIComponent(JSON.stringify(ids))}`, {
      method: 'DELETE',
    });
  }
  log(`Deleted ${ids.length} cases tagged "${TAG}".`);
  await deleteUser(actor);
  for (const username of LEGACY_USERS) await deleteUser({ username }, { quiet: true });
  try {
    await request(`${KIBANA}/api/security/role/${ROLE_NAME}`, { user: admin, method: 'DELETE' });
    log(`Deleted role ${ROLE_NAME}.`);
  } catch (error) {
    log(`Could not delete role ${ROLE_NAME}: ${error.message}`);
  }
};

/* ----------------------------------- main ---------------------------------- */

const main = async () => {
  if (!['auto', 'always', 'never'].includes(options.seed)) {
    throw new Error('--seed must be auto, always or never');
  }

  if (options['dry-run']) {
    log('Dry run. Nothing changes.');
    log(`Random seed: ${RANDOM_SEED}.`);
    log(`Would ${options.cleanup ? 'delete' : 'create'} ${CASE_COUNT} cases in ${KIBANA}.`);
    log(`Seed mode: ${options.seed}.`);
    log(`Endpoint emulator: node ${path.relative(REPO_ROOT, ENDPOINT_EMULATOR)} --asSuperuser`);
    log(
      `Data generator: node ${path.relative(
        REPO_ROOT,
        DATA_GENERATOR
      )} -n 500 -h 22 -u 23 --start-date 1d --end-date now --attacks`
    );
    return;
  }

  if (options.cleanup) {
    await cleanup();
    return;
  }

  await ensureRole();
  await ensureUser(actor, 'Case Delta User');
  const readers = [admin, actor, ...extraReaders].filter(
    (reader, index, all) => all.findIndex(({ username }) => username === reader.username) === index
  );
  for (const reader of extraReaders) {
    await es(reader, '/_security/_authenticate').catch(() => {
      throw new Error(`Cannot log in as ${reader.username}. Check the --reader password.`);
    });
  }
  await seedIfNeeded();

  const groups = await pickAlertsByHost();
  if (groups.length === 0) {
    throw new Error(
      `No host has ${MIN_ALERTS_PER_CASE} alerts in ${ALERTS_INDEX}. ` +
        'Run with --seed always, or lower --alerts-per-case.'
    );
  }
  if (groups.length < CASE_COUNT) {
    log(`Only ${groups.length} hosts have enough alerts. Creating ${groups.length} cases.`);
  }

  log(`Random seed: ${RANDOM_SEED}. Repeat these choices with --random-seed ${RANDOM_SEED}.`);
  // Every scenario is used before one repeats, in a random order.
  const scenarioOrder = shuffle(SCENARIOS.map((_, index) => index));
  const created = [];
  for (const [index, group] of groups.entries()) {
    const scenarioIndex = scenarioOrder[index % scenarioOrder.length];
    created.push(await seedCase(group, index, scenarioIndex, readers));
  }

  log('Done. Log in to see "What is new since your last visit":');
  log(`  ${admin.username} / ${admin.password}`);
  for (const reader of extraReaders) log(`  ${reader.username} (your password)`);
  log(`  ${actor.username} / ${actor.password} made the changes, so it does not see them as new.`);
  for (const { id, title } of created) {
    log(`  ${title}: ${KIBANA}${SPACE_PREFIX}/app/security/cases/${id}`);
  }
  log(
    'The view stays until the reader marks the case as seen, or opens it again after 30 minutes.'
  );
};

if (options.help) {
  console.log(HELP);
} else {
  main().catch((error) => {
    console.error(`[seed] ${error.message}`);
    process.exitCode = 1;
  });
}
