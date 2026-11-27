/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Measures the real log extraction, so a change to it can be compared with the code before it.
 *
 * Run it on one build, save the result under a label, switch the code, restart Kibana,
 * and run it again under another label. Then compare the two labels.
 *
 * What one run does
 *   1. Put the latest entities index back to the state it had at the start, so every run writes the
 *      same entities.
 *   2. Call POST /internal/security/entity_store/{entity}/force_log_extraction on a fixed window. A
 *      manual window does not move the saved cursors, so it can run again and again.
 *   3. Read what happened:
 *        - the wall time of the call, and the entity and page counts in the response
 *        - Elasticsearch counters of the latest index: refreshes, indexing, merges, rejections
 *        - the Kibana metrics of the run (query, probe, ingest and refresh time and counts), read
 *          from the local Elasticsearch where Kibana exports them
 *        - a checksum of the entities, to see if two builds wrote the same data
 *
 * The sum, count, minimum and maximum of a Kibana histogram are exact. Its individual values are
 * not: a value inside a bucket is stored as the middle of the bucket. So this script reports sums
 * and counts only. A difference below about 5% is inside the noise of one machine. Counts, such as
 * refreshes per run, are exact.
 *
 * !! This script DELETES AND RECREATES the latest entities index, from a copy it makes first. Use a
 * !! development cluster that nothing else uses, and pass --allow-reset-latest. The script puts the
 * !! index back when it ends. If it is killed hard, restore with --restore-from <the backup it
 * !! printed> --allow-reset-latest.
 *
 * Set up (once)
 *   - config/kibana.dev.yml keeps the scheduled extraction tasks out of the way, and exports the
 *     metrics to the local Elasticsearch:
 *       xpack.task_manager.unsafe.exclude_task_types: ['entity_store:v2:extract_entity*']
 *       telemetry.metrics:
 *         enabled: true
 *         interval: 5s
 *         exporters:
 *           - proto:
 *               url: http://localhost:9200/_otlp/v1/metrics
 *               temporalityPreference: delta
 *               headers:
 *                 authorization: "Basic ZWxhc3RpYzpjaGFuZ2VtZQ=="
 *   - Kibana runs the build to measure, with the Entity Store installed and started.
 *   - Logs are loaded in this Elasticsearch for the window, in an index the extraction reads (by
 *     default logs-*, filebeat-* and similar). Without logs in the window nothing is written and the
 *     numbers mean nothing. Count the logs in the window before the first run.
 *   - The starting state decides the workload. Entities that were extracted from the same logs
 *     already are rewritten as no-ops, which hides most of the write cost. Use --prime-window to
 *     empty the latest index and fill it from an earlier window, so the measured window creates and
 *     updates entities. The script then leaves the latest index in that primed state.
 *   - To get more entity pages from a small data set, lower docsLimit with the extraction config
 *     API (PUT /internal/security/entity_store/{entity}, body { "logExtraction": { "docsLimit": N } })
 *     and put it back after.
 *
 * Usage
 *   export ES_LOCAL_USERNAME=elastic ES_LOCAL_PASSWORD=changeme
 *   node x-pack/platform/plugins/shared/entity_store/scripts/profile_extraction.js \
 *     --label baseline --window 2026-11-27T13:59:00.000Z/2026-11-27T14:17:00.000Z --allow-reset-latest
 *   (switch the code, restart Kibana, run again with --label after-change)
 *   node x-pack/platform/plugins/shared/entity_store/scripts/profile_extraction.js \
 *     --compare baseline after-change
 *
 * Other options: --entity user, --runs 5, --warmup 2 (runs done first and not counted),
 * --process priority|nonPriority|all|single,
 * --kibana-url http://localhost:5601, --base-path /kbn (or put it in --kibana-url, or set
 * KIBANA_BASE_PATH), --namespace default, --prime-window <fromISO>/<toISO>,
 * --export-wait 12 (seconds, at least two export intervals), --ignore-fields a.b,c.d (fields left
 * out of the checksum), --keep-backup, --yes (a cluster that is not localhost), --allow-noise.
 * Results are written to profiles/<label>.json, which git ignores.
 */

require('@kbn/setup-node-env');

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('@elastic/elasticsearch');
const { timeoutSignal } = require('@kbn/std');
const { getEntitiesAlias, getEntityIndexPattern } = require('../common/domain/entity_index');

const PROFILES_DIR = path.resolve(__dirname, '..', 'profiles');
const SCRATCH_PREFIX = 'extraction-prof-';
const METRICS_INDEX = 'metrics-generic.otel-*';
const METRICS_SCOPE = 'kibana.entity_store';
const METRIC_PREFIX = 'kibana.entity_store.extraction.';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const median = (values) => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const fmt = (value, digits = 0) => (Number.isFinite(value) ? value.toFixed(digits) : '-');

const parseArgs = () => {
  const argv = process.argv.slice(2);
  const get = (flag, fallback) => {
    const at = argv.indexOf(flag);
    return at === -1 ? fallback : argv[at + 1];
  };
  const compareAt = argv.indexOf('--compare');
  if (compareAt !== -1) return { compare: [argv[compareAt + 1], argv[compareAt + 2]] };

  const restoreFrom = get('--restore-from');
  const [from, to] = (get('--window', '') || '').split('/');
  const label = get('--label');
  const [primeFrom, primeTo] = (get('--prime-window', '') || '').split('/');
  if (!restoreFrom && (!label || !from || !to)) {
    throw new Error('Pass --label <name> and --window <fromISO>/<toISO>, or --compare <a> <b>.');
  }
  return {
    label,
    window: { from, to },
    entity: get('--entity', 'user'),
    runs: Number(get('--runs', 5)),
    warmup: Number(get('--warmup', 0)),
    processName: get('--process'),
    namespace: get('--namespace', 'default'),
    kibanaUrl: get('--kibana-url', 'http://localhost:5601'),
    basePath: get('--base-path', process.env.KIBANA_BASE_PATH ?? ''),
    primeWindow: primeFrom && primeTo ? { from: primeFrom, to: primeTo } : undefined,
    exportWaitSeconds: Number(get('--export-wait', 12)),
    ignoreFields: (get('--ignore-fields', '') || '').split(',').filter(Boolean),
    restoreFrom,
    keepBackup: argv.includes('--keep-backup'),
    allowResetLatest: argv.includes('--allow-reset-latest'),
    allowNoise: argv.includes('--allow-noise'),
    yes: argv.includes('--yes'),
  };
};

// ---------------------------------------------------------------------------
// Elasticsearch: client, counters, and the latest index backup
// ---------------------------------------------------------------------------

const createEsClient = () => {
  const node = process.env.ES_URL ?? 'http://localhost:9200';
  const auth = process.env.ES_API_KEY
    ? { apiKey: process.env.ES_API_KEY }
    : {
        username: process.env.ES_LOCAL_USERNAME ?? 'elastic',
        password: process.env.ES_LOCAL_PASSWORD ?? 'changeme',
      };
  return { node, client: new Client({ node, auth, requestTimeout: 120000 }) };
};

const assertScratch = (index) => {
  if (!index.startsWith(SCRATCH_PREFIX)) {
    throw new Error(`Refusing to touch "${index}": only ${SCRATCH_PREFIX}* indices are allowed`);
  }
};

const sum = (values) => values.reduce((total, value) => total + (Number(value) || 0), 0);

// Counters of the latest index: refreshes, indexing, merges. Primaries and replicas are counted
// together, except for the indexing operations, which would count each write twice.
const indexSnapshot = async (client, index) => {
  const response = await client.indices.stats({ index, metric: ['indexing', 'refresh', 'merge'] });
  const total = response._all?.total ?? {};
  return {
    indexOps: response._all?.primaries?.indexing?.index_total ?? 0,
    indexMs: total.indexing?.index_time_in_millis ?? 0,
    throttleMs: total.indexing?.throttle_time_in_millis ?? 0,
    refreshCount: total.refresh?.total ?? 0,
    refreshMs: total.refresh?.total_time_in_millis ?? 0,
    mergeMs: total.merges?.total_time_in_millis ?? 0,
  };
};

// Write rejections and breaker trips of the cluster. Null when the user may not read node stats.
const nodeSnapshot = async (client) => {
  try {
    const response = await client.nodes.stats({
      metric: ['thread_pool', 'breaker'],
      filter_path: ['nodes.*.thread_pool.write', 'nodes.*.breakers'],
    });
    const nodes = Object.values(response.nodes ?? {});
    return {
      rejected: sum(nodes.map((n) => n.thread_pool?.write?.rejected)),
      breakerTripped: sum(
        nodes.flatMap((n) => Object.values(n.breakers ?? {}).map((b) => b.tripped))
      ),
    };
  } catch (error) {
    return null;
  }
};

const unblock = (client, index) =>
  client.indices.putSettings({ index, settings: { 'index.blocks.write': false } });

const waitYellow = (client, index) =>
  client.cluster.health({ index, wait_for_status: 'yellow', timeout: '60s' });

// Replaces the latest index with a clone of `backup`. A clone keeps the mapping and the settings of
// its source. The alias is not copied, so it is passed.
const swapLatestFromBackup = async ({ client, latest, alias, backup }) => {
  const clone = () =>
    client.indices.clone({ index: backup, target: latest, aliases: { [alias]: {} } });
  await client.indices.delete({ index: latest, ignore_unavailable: true });
  try {
    await clone();
  } catch (error) {
    // Something wrote to the missing index and made it again. Remove it and try once more.
    if (!String(error.message).includes('already exists')) throw error;
    await client.indices.delete({ index: latest, ignore_unavailable: true });
    await clone();
  }
  await unblock(client, latest);
  await waitYellow(client, latest);
};

const makeBackup = async ({ client, latest, backup }) => {
  assertScratch(backup);
  // A clone source must be read-only. The latest index is blocked only while it is cloned.
  await client.indices.putSettings({ index: latest, settings: { 'index.blocks.write': true } });
  try {
    await client.indices.clone({ index: latest, target: backup });
  } finally {
    await unblock(client, latest);
  }
  await client.indices.putSettings({ index: backup, settings: { 'index.blocks.write': true } });
  await waitYellow(client, backup);
  const [{ count: backupCount }, { count: latestCount }] = await Promise.all([
    client.count({ index: backup }),
    client.count({ index: latest }),
  ]);
  if (backupCount !== latestCount) {
    throw new Error(`The backup has ${backupCount} documents and ${latest} has ${latestCount}.`);
  }
  return backupCount;
};

// A short digest of every entity document, in a fixed order, to see if two runs wrote the same data.
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])])
    );
  }
  return value;
};

const withoutFields = (doc, fields) => {
  if (fields.length === 0) return doc;
  const copy = JSON.parse(JSON.stringify(doc));
  for (const field of fields) {
    const parts = field.split('.');
    let node = copy;
    for (let i = 0; i < parts.length - 1 && node; i++) node = node[parts[i]];
    if (node) delete node[parts[parts.length - 1]];
    delete copy[field];
  }
  return copy;
};

const checksumOf = async (client, index, ignoreFields) => {
  const digests = [];
  for await (const doc of client.helpers.scrollDocuments({
    index,
    size: 2000,
    query: { match_all: {} },
  })) {
    const text = JSON.stringify(canonical(withoutFields(doc, ignoreFields)));
    digests.push(crypto.createHash('sha256').update(text).digest('hex'));
  }
  digests.sort();
  return crypto.createHash('sha256').update(digests.join('')).digest('hex').slice(0, 16);
};

// ---------------------------------------------------------------------------
// Kibana: the extraction call, and the metrics it exported
// ---------------------------------------------------------------------------

const kibanaAuthorization = () => {
  if (process.env.KIBANA_API_KEY) return `ApiKey ${process.env.KIBANA_API_KEY}`;
  const username = process.env.KIBANA_USERNAME ?? process.env.ES_LOCAL_USERNAME ?? 'elastic';
  const password = process.env.KIBANA_PASSWORD ?? process.env.ES_LOCAL_PASSWORD ?? 'changeme';
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
};

// Sends a request. Resolves with { status, ok, body, text } and does not throw on an HTTP error.
const kibanaRequest = async (args, method, urlPath, { body, version } = {}) => {
  const spacePrefix = args.namespace !== 'default' ? `/s/${args.namespace}` : '';
  // The base path of a dev server, for example /kbn. It can also be part of --kibana-url.
  const basePath = args.basePath ? `/${args.basePath.replace(/^\/+|\/+$/g, '')}` : '';
  const deadline = timeoutSignal(15 * 60 * 1000);
  try {
    const response = await fetch(
      `${args.kibanaUrl.replace(/\/$/, '')}${basePath}${spacePrefix}${urlPath}`,
      {
        method,
        headers: {
          Authorization: kibanaAuthorization(),
          'Content-Type': 'application/json',
          'kbn-xsrf': 'entity-store-profile-script',
          'x-elastic-internal-origin': 'Kibana',
          ...(version ? { 'elastic-api-version': version } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: deadline,
      }
    );
    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch (error) {
      json = undefined;
    }
    return { status: response.status, ok: response.ok, body: json, text };
  } finally {
    deadline.dispose();
  }
};

const forceExtraction = (args) =>
  kibanaRequest(
    args,
    'POST',
    `/internal/security/entity_store/${args.entity}/force_log_extraction`,
    {
      version: '2',
      body: {
        fromDateISO: args.window.from,
        toDateISO: args.window.to,
        ...(args.processName ? { process: args.processName } : {}),
      },
    }
  );

// With process "all" the response holds one summary per process.
const summariesOf = (body) =>
  body && (body.priority || body.nonPriority)
    ? [body.priority, body.nonPriority].filter(Boolean)
    : [body];

// Adds the metric documents Kibana exported since `since`. A histogram document has an exact sum,
// minimum, maximum and count. A counter document is a number.
const readMetrics = async (client, args, since) => {
  await client.indices.refresh({ index: METRICS_INDEX, ignore_unavailable: true });
  const filter = [
    { term: { 'scope.name': METRICS_SCOPE } },
    { term: { 'attributes.entity_type': args.entity } },
    { range: { '@timestamp': { gte: new Date(since).toISOString() } } },
  ];
  const totals = {};
  let gitRev;
  for await (const doc of client.helpers.scrollDocuments({
    index: METRICS_INDEX,
    size: 1000,
    query: { bool: { filter } },
  })) {
    gitRev = gitRev ?? doc.resource?.attributes?.git_rev;
    for (const [fullName, value] of Object.entries(doc.metrics ?? {})) {
      if (!fullName.startsWith(METRIC_PREFIX)) continue;
      const name = fullName.slice(METRIC_PREFIX.length);
      const entry = (totals[name] = totals[name] ?? { count: 0, sum: 0 });
      if (typeof value === 'number') {
        // A counter: only the sum means something.
        entry.sum += value;
      } else if (value && typeof value === 'object' && typeof value.sum === 'number') {
        const buckets = [...(value.positive?.counts ?? []), ...(value.negative?.counts ?? [])];
        entry.count += sum(buckets) + (value.zero_count ?? 0);
        entry.sum += value.sum;
      } else if (value && typeof value === 'object' && typeof value.value === 'number') {
        entry.sum += value.value;
      }
    }
  }
  return { totals, gitRev };
};

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

// One flat list of numbers per run, so runs and labels can be compared in the same way.
const flatten = (run) => {
  const flat = { wallMs: run.wallMs, entities: run.entities, pages: run.pages };
  for (const [key, value] of Object.entries(run.es)) flat[`es.${key}`] = value;
  for (const [name, { count, sum: total }] of Object.entries(run.otel)) {
    // Only a histogram has a count of observations.
    if (count > 0) flat[`otel.${name}.count`] = count;
    flat[`otel.${name}.sum`] = total;
  }
  // The whole write phase: the bulk requests, plus the refresh. Before the refresh had its own
  // metric, its time was inside ingest.duration_ms, so only this total compares across builds.
  flat['otel.ingest_phase_total.sum'] =
    (run.otel['ingest.duration_ms']?.sum ?? 0) + (run.otel['ingest.refresh.duration_ms']?.sum ?? 0);
  return flat;
};

const medians = (result) => {
  const flats = result.runs.map(flatten);
  const keys = [...new Set(flats.flatMap(Object.keys))];
  return Object.fromEntries(
    keys.map((key) => [key, median(flats.map((f) => f[key]).filter((v) => Number.isFinite(v)))])
  );
};

const loadResult = (labelOrPath) => {
  const file =
    labelOrPath.includes('/') || labelOrPath.endsWith('.json')
      ? labelOrPath
      : path.join(PROFILES_DIR, `${labelOrPath}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const checksumNote = (result) => {
  const unique = [...new Set(result.runs.map((r) => r.checksum))];
  return unique.length === 1 ? unique[0] : `NOT STABLE (${unique.length} different)`;
};

const printResult = (result) => {
  console.log(
    `\n${result.label}: ${result.runs.length} runs, kibana build ${result.gitRev ?? '?'}`
  );
  console.log(`window ${result.window.from} to ${result.window.to}, entity ${result.entity}`);
  console.log(`entities checksum: ${checksumNote(result)}`);
  const m = medians(result);
  for (const key of Object.keys(m)) console.log(`  ${key.padEnd(44)} ${fmt(m[key], 1)}`);
};

const printComparison = (a, b) => {
  const ma = medians(a);
  const mb = medians(b);
  console.log(`\nBaseline  ${a.label} (build ${a.gitRev ?? '?'}, ${a.runs.length} runs)`);
  console.log(`Change    ${b.label} (build ${b.gitRev ?? '?'}, ${b.runs.length} runs)`);
  console.log(`Checksum  ${checksumNote(a)} against ${checksumNote(b)}`);
  if (checksumNote(a) !== checksumNote(b)) {
    console.log(
      '  The two builds wrote different data, or the checksum is not stable. Check --ignore-fields.'
    );
  }
  console.log(
    `\n${'metric (median)'.padEnd(44)} ${'baseline'.padStart(12)} ${'change'.padStart(
      12
    )}   difference`
  );
  for (const key of [...new Set([...Object.keys(ma), ...Object.keys(mb)])]) {
    const before = ma[key];
    const after = mb[key];
    const delta =
      Number.isFinite(before) && Number.isFinite(after) && before !== 0
        ? `${fmt(((after - before) / before) * 100, 1)}%`
        : '-';
    console.log(
      `${key.padEnd(44)} ${fmt(before, 1).padStart(12)} ${fmt(after, 1).padStart(12)}   ${delta}`
    );
  }
  console.log(
    '\nCounts are exact. A difference below about 5% in a time is inside the noise of one machine.'
  );
};

// ---------------------------------------------------------------------------

const main = async () => {
  const args = parseArgs();
  if (args.compare) {
    printComparison(loadResult(args.compare[0]), loadResult(args.compare[1]));
    return;
  }

  const { node, client } = createEsClient();
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(node) && !args.yes) {
    throw new Error(`This changes ${node}. Pass --yes to confirm.`);
  }
  if (!args.allowResetLatest) {
    throw new Error(
      'The script deletes and recreates the latest index between runs. Pass --allow-reset-latest.'
    );
  }

  const alias = getEntitiesAlias('latest', args.namespace);
  // If an earlier run was killed between deleting and cloning, the alias is gone. Then the usual name
  // of the first latest index is the best guess.
  let latest = `${getEntityIndexPattern({
    schemaVersion: 'v2',
    dataset: 'latest',
    namespace: args.namespace,
  })}-00001`;
  try {
    latest = Object.keys(await client.indices.getAlias({ name: alias }))[0] ?? latest;
  } catch (error) {
    // Keep the guess.
  }

  if (args.restoreFrom) {
    assertScratch(args.restoreFrom);
    await swapLatestFromBackup({ client, latest, alias, backup: args.restoreFrom });
    console.log(`Restored ${latest} from ${args.restoreFrom}.`);
    return;
  }
  if (!(await client.indices.exists({ index: latest }))) {
    throw new Error(
      `${latest} does not exist on this cluster. The Entity Store must be installed.`
    );
  }

  const status = await kibanaRequest(args, 'GET', '/api/security/entity_store/status', {
    version: '2023-10-31',
  });
  if (!status.ok) {
    throw new Error(
      `Kibana did not answer the status request (HTTP ${status.status}). Check --kibana-url, --base-path and the credentials.`
    );
  }

  console.log(`Checking for other writes to ${latest} for 5 s...`);
  const quietBefore = (await indexSnapshot(client, latest)).indexOps;
  await sleep(5000);
  const otherWrites = (await indexSnapshot(client, latest)).indexOps - quietBefore;
  if (otherWrites > 0 && !args.allowNoise) {
    throw new Error(
      `${otherWrites} writes reached ${latest} while the script watched. Something else is writing, probably the scheduled extraction tasks. Exclude them (see the top of this file), or pass --allow-noise.`
    );
  }

  if (args.primeWindow) {
    console.log(
      `Emptying ${latest} and filling it from ${args.primeWindow.from} to ${args.primeWindow.to}...`
    );
    await client.deleteByQuery({
      index: latest,
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
    });
    const primed = await forceExtraction({ ...args, window: args.primeWindow });
    const primedSummaries = primed.ok ? summariesOf(primed.body) : [];
    if (!primed.ok || primedSummaries.some((s) => !s || s.success !== true)) {
      throw new Error(`The priming extraction failed (HTTP ${primed.status}). See the Kibana log.`);
    }
    await client.indices.refresh({ index: latest });
    console.log(
      `Primed with ${sum(
        primedSummaries.map((s) => s.count)
      )} entities. The script leaves ${latest} in this state when it ends, not in the state it had before.`
    );
  }
  const { count: startEntities } = await client.count({ index: latest });
  console.log(`The runs start from ${startEntities} entities in ${latest}.`);
  if (startEntities > 0 && !args.primeWindow) {
    console.log(
      'If they were extracted from this same window, the writes are no-ops. Use --prime-window to measure creates and updates.'
    );
  }

  const backup = `${SCRATCH_PREFIX}${Date.now()}`;
  assertScratch(backup);
  console.log(`Backing up ${latest} to ${backup}...`);
  const backupDocs = await makeBackup({ client, latest, backup });
  console.log(`Backup ready: ${backupDocs} documents.`);

  let swapped = false;
  const cleanup = async () => {
    try {
      if (swapped) await swapLatestFromBackup({ client, latest, alias, backup });
      else await unblock(client, latest);
      console.log(`Restored ${latest} to the state it had at the start.`);
    } catch (error) {
      console.error(`RESTORING ${latest} FAILED: ${error.message}`);
      console.error(
        `The backup is ${backup}. Restore it with: --restore-from ${backup} --allow-reset-latest`
      );
      return;
    }
    if (!args.keepBackup)
      await client.indices.delete({ index: backup, ignore_unavailable: true }).catch(() => {});
  };
  process.on('SIGINT', async () => {
    console.log('\nInterrupted, restoring the latest index...');
    await cleanup();
    process.exit(130);
  });

  const runs = [];
  let gitRev;
  try {
    for (let run = 1; run <= args.warmup + args.runs; run++) {
      await swapLatestFromBackup({ client, latest, alias, backup });
      swapped = true;

      const nodeBefore = await nodeSnapshot(client);
      const indexBefore = await indexSnapshot(client, latest);
      const startedAt = Date.now();
      const response = await forceExtraction(args);
      const wallMs = Date.now() - startedAt;
      const indexAfter = await indexSnapshot(client, latest);
      const nodeAfter = await nodeSnapshot(client);

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.text.slice(0, 300)}`);
      const summaries = summariesOf(response.body);
      if (summaries.some((s) => !s || s.success !== true)) {
        throw new Error('The extraction failed. See the Kibana log for the error.');
      }

      // Kibana exports metrics on an interval, so wait for the last ones of this run.
      await sleep(args.exportWaitSeconds * 1000);
      const metrics = await readMetrics(client, args, startedAt);
      gitRev = gitRev ?? metrics.gitRev;
      if (Object.keys(metrics.totals).length === 0) {
        throw new Error(
          `No Kibana metrics found in ${METRICS_INDEX} for this run. Is telemetry.metrics exporting to this cluster (see the top of this file)?`
        );
      }
      const checksum = await checksumOf(client, latest, args.ignoreFields);

      const record = {
        run: run - args.warmup,
        wallMs,
        entities: sum(summaries.map((s) => s.count)),
        pages: sum(summaries.map((s) => s.pages)),
        es: {
          refreshCount: indexAfter.refreshCount - indexBefore.refreshCount,
          refreshMs: indexAfter.refreshMs - indexBefore.refreshMs,
          indexOps: indexAfter.indexOps - indexBefore.indexOps,
          indexMs: indexAfter.indexMs - indexBefore.indexMs,
          mergeMs: indexAfter.mergeMs - indexBefore.mergeMs,
          throttleMs: indexAfter.throttleMs - indexBefore.throttleMs,
          rejected: nodeBefore && nodeAfter ? nodeAfter.rejected - nodeBefore.rejected : NaN,
          breakerTripped:
            nodeBefore && nodeAfter ? nodeAfter.breakerTripped - nodeBefore.breakerTripped : NaN,
        },
        otel: metrics.totals,
        checksum,
      };
      // The first runs after a Kibana restart can be slower. A warm-up run is done but not counted.
      const isWarmup = run <= args.warmup;
      if (!isWarmup) runs.push(record);
      console.log(
        isWarmup
          ? `  warm-up ${run}/${args.warmup}: ${wallMs} ms (not counted)`
          : `  run ${run - args.warmup}/${args.runs}: ${wallMs} ms, ${record.entities} entities`
      );
    }
  } finally {
    await cleanup();
  }

  const result = {
    label: args.label,
    entity: args.entity,
    window: args.window,
    gitRev,
    process: args.processName ?? null,
    createdAt: new Date().toISOString(),
    runs,
  };
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  const file = path.join(PROFILES_DIR, `${args.label}.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
  printResult(result);
  console.log(`\nSaved ${file}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
