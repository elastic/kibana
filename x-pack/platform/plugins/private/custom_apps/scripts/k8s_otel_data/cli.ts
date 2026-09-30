/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { readEsConfig } from './read_es_config';
import {
  CLUSTER_DATASET,
  DEFAULTS,
  DEFAULT_NAMESPACE,
  KUBELET_DATASET,
  PROFILES,
  alertIndexName,
  logsIndex,
  metricsIndex,
} from './config';
import { cleanSeed } from './clean';
import { generate } from './generate';
import { Indexer } from './indexer';
import { parseDuration } from './signals';
import {
  assertNotAlreadySeeded,
  assertOtelComponentTemplates,
  ensureAlertIndex,
  ensureMetricsTemplate,
} from './templates';
import { buildTopology } from './topology';
import { alertStatusDoc, logDoc, podMetricsDoc } from './docs';
import { evaluateHealth } from './scenarios';

/** `run()` gives unset string flags as `''`, so absence has to be checked explicitly. */
const text = (value: unknown, fallback: string): string => {
  const given = typeof value === 'string' ? value.trim() : '';
  return given === '' ? fallback : given;
};

const count = (value: unknown, fallback: number): number => {
  const parsed = Number(text(value, String(fallback)));
  if (!Number.isFinite(parsed)) throw new Error(`Expected a number, got "${String(value)}".`);
  return parsed;
};

const numberList = (value: unknown, fallback: string): number[] =>
  text(value, fallback)
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part) && part > 0);

const esqlRows = async (client: Client, query: string): Promise<unknown[][]> => {
  const response = await client.esql.query({ query });
  return (response.values ?? []) as unknown[][];
};

const verify = async (client: Client, namespace: string, log: ToolingLog): Promise<void> => {
  const kubelet = metricsIndex(KUBELET_DATASET, namespace);

  const [counts] = await esqlRows(
    client,
    `FROM ${kubelet} | STATS pods = COUNT_DISTINCT(resource.attributes.k8s.pod.uid),
       nodes = COUNT_DISTINCT(resource.attributes.k8s.node.name),
       clusters = COUNT_DISTINCT(resource.attributes.k8s.cluster.name)`
  );
  log.info(`Entities: ${counts?.[0]} pods, ${counts?.[1]} nodes, ${counts?.[2]} clusters`);

  const [span] = await esqlRows(
    client,
    `FROM ${kubelet} | STATS oldest = MIN(@timestamp), newest = MAX(@timestamp)`
  );
  log.info(`Time span: ${span?.[0]} to ${span?.[1]}`);

  // The short form only resolves if the OTel passthrough mappings are in effect.
  try {
    const passthrough = await esqlRows(
      client,
      `FROM ${kubelet} | STATS c = COUNT(*) BY k8s.cluster.name | SORT c DESC`
    );
    log.info(
      `Passthrough field names resolve: ${passthrough
        .map((row) => `${row[1]}=${row[0]}`)
        .join(', ')}`
    );
  } catch (error) {
    log.warning(`Bare passthrough names did not resolve: ${error.message}`);
  }

  try {
    const health = await esqlRows(
      client,
      // Node documents carry no pod uid, so they have to be dropped before the join
      // or they arrive as a spurious null bucket.
      `FROM ${kubelet} | WHERE @timestamp >= NOW() - 30 minutes
       | STATS x = MAX(metrics.k8s.pod.cpu.usage) BY entity_id = resource.attributes.k8s.pod.uid
       | WHERE entity_id IS NOT NULL
       | LOOKUP JOIN ${alertIndexName(namespace)} ON entity_id
       | STATS n = COUNT(*) BY alert_status | SORT n DESC`
    );
    log.info(`Health via LOOKUP JOIN: ${health.map((row) => `${row[1]}=${row[0]}`).join(', ')}`);
  } catch (error) {
    log.warning(`LOOKUP JOIN failed, fall back to attributes.demo.alert_status: ${error.message}`);
  }

  const errors = await esqlRows(
    client,
    `FROM ${logsIndex(namespace)} | WHERE severity_text IN ("ERROR", "FATAL")
     | STATS errors = COUNT(*) BY pod = resource.attributes.k8s.pod.name
     | SORT errors DESC | LIMIT 5`
  );
  log.info(`Noisiest pods: ${errors.map((row) => `${row[1]} (${row[0]})`).join(', ') || 'none'}`);
};

run(
  async ({ log, flags }) => {
    const namespace = text(flags.namespace, DEFAULT_NAMESPACE);
    const { node, username, password } = readEsConfig(log, text(flags.config, '') || undefined);
    const client = new Client({ node, auth: { username, password } });

    if (flags.clean || flags['clean-only']) {
      await cleanSeed(client, namespace, log);
      if (flags['clean-only']) return;
    }

    const profileName = text(flags.profile, DEFAULTS.profile);
    const profile = PROFILES[profileName];
    if (!profile) {
      throw new Error(
        `Unknown profile "${profileName}". Use one of ${Object.keys(PROFILES).join(', ')}.`
      );
    }

    const intervalMs = parseDuration(text(flags.interval, profile.interval));
    const lookbackMs = parseDuration(text(flags.lookback, profile.lookback));
    if (lookbackMs > parseDuration('7d')) {
      throw new Error('--lookback cannot exceed 7d: index.look_back_time is capped there.');
    }

    // Snapping to an absolute grid is what makes a re-run within the same interval
    // deduplicate instead of laying down a second, shifted copy.
    const endMs = Math.floor(Date.now() / intervalMs) * intervalMs;
    const startMs = endMs - lookbackMs;

    const seed = count(flags.seed, DEFAULTS.seed);
    const clusterCount = count(flags.clusters, DEFAULTS.clusters);
    const topology = buildTopology({
      seed,
      clusterCount,
      podsPerCluster: numberList(flags.pods, DEFAULTS.pods),
      nodesPerCluster: numberList(flags.nodes, DEFAULTS.nodes),
      unhealthy: count(flags.unhealthy, DEFAULTS.unhealthy),
      nowMs: endMs,
    });

    log.info(
      `Topology: ${topology.clusters.length} clusters, ${topology.pods.length} pods, ` +
        `${topology.nodes.length} nodes, ${topology.deployments.length} deployments`
    );
    for (const cluster of topology.clusters) {
      const podCount = topology.pods.filter((pod) => pod.cluster.name === cluster.name).length;
      log.info(`  ${cluster.name} (${cluster.region}): ${podCount} pods`);
    }

    if (flags['dry-run']) {
      const pod = topology.pods.find((candidate) => candidate.scenario !== 'healthy')!;
      const health = evaluateHealth(pod, seed);
      const sample = {
        cpuUsage: 1.48,
        cpuLimitUtilisation: 0.74,
        cpuNodeUtilisation: 0.046,
        memoryWorkingSet: 1073741824,
        memoryRss: 903086080,
        memoryLimitUtilisation: 0.5,
        networkIo: 124583,
        restarts: 14,
      };
      const index = metricsIndex(KUBELET_DATASET, namespace);
      log.info('Sample pod metrics document:');
      log.info(
        JSON.stringify(podMetricsDoc(pod, sample, endMs, health.status, index, namespace), null, 2)
      );
      log.info('Sample log document:');
      log.info(
        JSON.stringify(
          logDoc(pod, 'ERROR', 'context deadline exceeded', 503, endMs, logsIndex(namespace)),
          null,
          2
        )
      );
      log.info('Sample alert status document:');
      log.info(
        JSON.stringify(alertStatusDoc(pod, health, endMs, alertIndexName(namespace)), null, 2)
      );
      return;
    }

    await assertOtelComponentTemplates(client);
    if (!flags.append) await assertNotAlreadySeeded(client, namespace);
    await ensureMetricsTemplate(client, namespace, log);
    await ensureAlertIndex(client, namespace, log);

    const indexer = new Indexer(client, {
      batchSize: count(flags['batch-size'], DEFAULTS.batchSize),
      concurrency: count(flags.concurrency, DEFAULTS.concurrency),
      log,
    });

    const started = Date.now();
    log.info(
      `Generating ${new Date(startMs).toISOString()} → ${new Date(endMs).toISOString()} ` +
        `at ${text(flags.interval, profile.interval)} intervals`
    );

    await generate({
      topology,
      indexer,
      startMs,
      endMs,
      intervalMs,
      namespace,
      seed,
      logsPerMinute: count(flags['logs-per-minute'], DEFAULTS.logsPerMinute),
      includeLogs: !flags['no-logs'],
      includeVolumes: !flags['no-volumes'],
      includeContainers: !flags['no-containers'],
      log,
    });

    const { indexed, skipped, failed } = indexer.stats;
    log.success(
      `Indexed ${indexed.toLocaleString()}, already present ${skipped.toLocaleString()}, ` +
        `failed ${failed.toLocaleString()} in ${Math.round((Date.now() - started) / 1000)}s`
    );

    await client.indices.refresh({
      index: `${metricsIndex(KUBELET_DATASET, namespace)},${metricsIndex(
        CLUSTER_DATASET,
        namespace
      )},${logsIndex(namespace)},${alertIndexName(namespace)}`,
    });

    await verify(client, namespace, log);
  },
  {
    description: `
      Generates OTel-native Kubernetes sample data — pods, nodes, deployments,
      containers, volumes, logs and alert state — for the Custom Apps prototype.

      Writes to metrics-kubeletstatsreceiver.otel-<namespace>,
      metrics-k8sclusterreceiver.otel-<namespace>, logs-k8s.otel-<namespace> and
      <namespace>_alert_status.
    `,
    flags: {
      string: [
        'config',
        'namespace',
        'profile',
        'lookback',
        'interval',
        'clusters',
        'pods',
        'nodes',
        'seed',
        'unhealthy',
        'logs-per-minute',
        'batch-size',
        'concurrency',
      ],
      boolean: [
        'clean',
        'clean-only',
        'append',
        'dry-run',
        'no-logs',
        'no-volumes',
        'no-containers',
      ],
      default: { namespace: DEFAULT_NAMESPACE, profile: DEFAULTS.profile },
      help: `
        --config            Kibana config file (default config/kibana.dev.yml)
        --clean             Delete this seed's data streams, template and index first
        --clean-only        Clean and exit
        --append            Add to an existing seed instead of refusing
        --dry-run           Print one document of each kind and exit
        --profile           quick (2h/1m) | default (24h/5m) | deep (7d/30m)
        --lookback          How far back to backfill, at most 7d
        --interval          Sampling interval, e.g. 30s, 1m, 5m
        --namespace         Data stream namespace suffix (default ${DEFAULT_NAMESPACE})
        --clusters          Number of clusters (default ${DEFAULTS.clusters})
        --pods              Pods per cluster, comma separated (default ${DEFAULTS.pods})
        --nodes             Nodes per cluster, comma separated (default ${DEFAULTS.nodes})
        --seed              PRNG seed; the same seed regenerates identical data
        --unhealthy         Pods given a failure archetype (default ${DEFAULTS.unhealthy})
        --logs-per-minute   Cluster-wide log rate (default ${DEFAULTS.logsPerMinute})
        --no-logs           Skip log generation
        --no-volumes        Skip volume metrics
        --no-containers     Skip container state metrics
        --batch-size        Documents per bulk request (default ${DEFAULTS.batchSize})
        --concurrency       In-flight bulk requests (default ${DEFAULTS.concurrency})
      `,
    },
  }
);
