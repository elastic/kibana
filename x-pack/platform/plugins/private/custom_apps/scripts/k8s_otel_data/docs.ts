/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COLLECTOR_VERSION, SCHEMA_URL } from './config';
import { round } from './signals';
import type { Cluster, Container, Deployment, K8sNode, Pod, Volume } from './topology';
import type { AlertStatus, PodHealth } from './scenarios';

export interface BulkDoc {
  index: string;
  doc: Record<string, unknown>;
  /**
   * Set for anything not going into a TSDB metrics stream. Those derive `_id` from
   * `_tsid` + `@timestamp` (`index.mapping.synthetic_id`) and so deduplicate on their
   * own; a plain index would otherwise gain a second copy of every document on each
   * run, which for the alert lookup index means every pod joining twice.
   */
  id?: string;
  /** `index` overwrites an existing document; `create` (the default) skips it. */
  op?: 'create' | 'index';
  /**
   * Named dynamic templates must be selected per document: the ones in
   * `metrics-otel@mappings` have no `match` clause, so without this a value that
   * happens to arrive as `0` maps as `long` and every later float is silently
   * dropped by `ignore_malformed`.
   */
  dynamicTemplates?: Record<string, string>;
}

/** Anything that can be fractional is a double; byte and event counts are longs. */
const metricTypes = (
  metrics: Record<string, number>,
  longFields: readonly string[]
): Record<string, string> => {
  const templates: Record<string, string> = {};
  for (const name of Object.keys(metrics)) {
    templates[`metrics.${name}`] = longFields.includes(name) ? 'gauge_long' : 'gauge_double';
  }
  return templates;
};

const cloudAttributes = (cluster: Cluster, zone?: string) => ({
  'cloud.provider': cluster.provider,
  'cloud.platform': cluster.platform,
  'cloud.region': cluster.region,
  'cloud.account.id': cluster.accountId,
  ...(zone ? { 'cloud.availability_zone': zone } : {}),
});

const clusterAttributes = (cluster: Cluster) => ({
  'k8s.cluster.name': cluster.name,
  'k8s.cluster.uid': cluster.uid,
});

const nodeAttributes = (node: K8sNode) => ({
  ...clusterAttributes(node.cluster),
  'k8s.node.name': node.name,
  'k8s.node.uid': node.uid,
  'host.name': node.name,
  'host.arch': 'amd64',
  'os.type': 'linux',
  ...cloudAttributes(node.cluster, node.zone),
});

const podAttributes = (pod: Pod) => ({
  ...nodeAttributes(pod.node),
  'k8s.namespace.name': pod.namespace.name,
  'k8s.pod.name': pod.name,
  'k8s.pod.uid': pod.uid,
  'k8s.pod.start_time': new Date(pod.startTimeMs).toISOString(),
  'k8s.deployment.name': pod.deployment.name,
  'k8s.replicaset.name': `${pod.deployment.name}-${pod.deployment.replicaSet}`,
  'service.name': pod.deployment.name,
  'service.namespace': pod.namespace.name,
  'service.instance.id': pod.uid,
  'service.version': pod.serviceVersion,
  'deployment.environment': pod.environment,
  'deployment.environment.name': pod.environment,
  'telemetry.sdk.name': 'opentelemetry',
  'telemetry.sdk.language': 'go',
  'telemetry.sdk.version': '1.34.0',
});

const dataStream = (dataset: string, namespace: string) => ({
  data_stream: { type: 'metrics', dataset, namespace },
});

export interface PodSample {
  cpuUsage: number;
  cpuLimitUtilisation: number;
  cpuNodeUtilisation: number;
  memoryWorkingSet: number;
  memoryRss: number;
  memoryLimitUtilisation: number;
  networkIo: number;
  restarts: number;
}

const POD_LONG_METRICS = [
  'k8s.pod.memory.working_set',
  'k8s.pod.memory.rss',
  'k8s.pod.memory.usage',
  'k8s.pod.memory.available',
  'k8s.pod.filesystem.usage',
  'k8s.pod.filesystem.capacity',
  'k8s.pod.filesystem.available',
  'k8s.pod.network.io',
  'k8s.pod.network.errors',
  'k8s.pod.uptime',
];

export const podMetricsDoc = (
  pod: Pod,
  sample: PodSample,
  timeMs: number,
  health: AlertStatus,
  index: string,
  namespace: string
): BulkDoc => {
  const filesystemCapacity = 10 * 1024 ** 3;
  const filesystemUsage = Math.round(filesystemCapacity * 0.05 * (1 + sample.cpuLimitUtilisation));
  const metrics: Record<string, number> = {
    'k8s.pod.cpu.usage': round(sample.cpuUsage),
    'k8s.pod.cpu.node.utilization': round(sample.cpuNodeUtilisation),
    'k8s.pod.cpu_limit_utilization': round(sample.cpuLimitUtilisation),
    'k8s.pod.cpu_request_utilization': round(sample.cpuLimitUtilisation * 2),
    'k8s.pod.memory.working_set': Math.round(sample.memoryWorkingSet),
    'k8s.pod.memory.rss': Math.round(sample.memoryRss),
    'k8s.pod.memory.usage': Math.round(sample.memoryWorkingSet * 1.1),
    'k8s.pod.memory.available': Math.max(0, Math.round(pod.memLimit - sample.memoryWorkingSet)),
    'k8s.pod.memory_limit_utilization': round(sample.memoryLimitUtilisation),
    'k8s.pod.memory_request_utilization': round(sample.memoryLimitUtilisation * 1.25),
    'k8s.pod.filesystem.usage': filesystemUsage,
    'k8s.pod.filesystem.capacity': filesystemCapacity,
    'k8s.pod.filesystem.available': filesystemCapacity - filesystemUsage,
    'k8s.pod.network.io': Math.round(sample.networkIo),
    'k8s.pod.network.errors': sample.restarts > 3 ? sample.restarts : 0,
    'k8s.pod.uptime': Math.max(0, Math.round((timeMs - pod.startTimeMs) / 1000)),
  };

  return {
    index,
    doc: {
      '@timestamp': new Date(timeMs).toISOString(),
      start_timestamp: new Date(pod.startTimeMs).toISOString(),
      ...dataStream('kubeletstatsreceiver.otel', namespace),
      _metric_names_hash: 'kubeletstats.pod',
      resource: { schema_url: SCHEMA_URL, attributes: podAttributes(pod) },
      scope: { name: 'otelcol/kubeletstatsreceiver', version: COLLECTOR_VERSION },
      attributes: { 'demo.alert_status': health, 'demo.scenario': pod.scenario },
      metrics,
    },
    dynamicTemplates: metricTypes(metrics, POD_LONG_METRICS),
  };
};

export interface NodeSample {
  cpuUsage: number;
  memoryWorkingSet: number;
  networkIo: number;
  podCount: number;
}

const NODE_LONG_METRICS = [
  'k8s.node.memory.working_set',
  'k8s.node.memory.rss',
  'k8s.node.memory.usage',
  'k8s.node.memory.available',
  'k8s.node.filesystem.usage',
  'k8s.node.filesystem.capacity',
  'k8s.node.filesystem.available',
  'k8s.node.network.io',
  'k8s.node.network.errors',
  'k8s.node.uptime',
];

export const nodeMetricsDoc = (
  node: K8sNode,
  sample: NodeSample,
  timeMs: number,
  index: string,
  namespace: string
): BulkDoc => {
  const filesystemUsage = Math.round(node.filesystemBytes * 0.3);
  const metrics: Record<string, number> = {
    'k8s.node.cpu.usage': round(sample.cpuUsage),
    'k8s.node.cpu.time': round(sample.cpuUsage * 3600),
    'k8s.node.memory.working_set': Math.round(sample.memoryWorkingSet),
    'k8s.node.memory.rss': Math.round(sample.memoryWorkingSet * 0.8),
    'k8s.node.memory.usage': Math.round(sample.memoryWorkingSet * 1.08),
    'k8s.node.memory.available': Math.max(
      0,
      Math.round(node.memoryBytes - sample.memoryWorkingSet)
    ),
    'k8s.node.filesystem.usage': filesystemUsage,
    'k8s.node.filesystem.capacity': node.filesystemBytes,
    'k8s.node.filesystem.available': node.filesystemBytes - filesystemUsage,
    'k8s.node.network.io': Math.round(sample.networkIo),
    'k8s.node.network.errors': 0,
    'k8s.node.uptime': 1_382_400,
  };

  return {
    index,
    doc: {
      '@timestamp': new Date(timeMs).toISOString(),
      ...dataStream('kubeletstatsreceiver.otel', namespace),
      _metric_names_hash: 'kubeletstats.node',
      resource: { schema_url: SCHEMA_URL, attributes: nodeAttributes(node) },
      scope: { name: 'otelcol/kubeletstatsreceiver', version: COLLECTOR_VERSION },
      metrics,
    },
    dynamicTemplates: metricTypes(metrics, NODE_LONG_METRICS),
  };
};

export const volumeMetricsDoc = (
  pod: Pod,
  volume: Volume,
  usedFraction: number,
  timeMs: number,
  index: string,
  namespace: string
): BulkDoc => {
  const used = Math.round(volume.capacityBytes * usedFraction);
  const metrics: Record<string, number> = {
    'k8s.volume.capacity': volume.capacityBytes,
    'k8s.volume.available': volume.capacityBytes - used,
    'k8s.volume.inodes': 655_360,
    'k8s.volume.inodes.used': Math.round(655_360 * usedFraction * 0.02),
    'k8s.volume.inodes.free': Math.round(655_360 * (1 - usedFraction * 0.02)),
  };

  return {
    index,
    doc: {
      '@timestamp': new Date(timeMs).toISOString(),
      ...dataStream('kubeletstatsreceiver.otel', namespace),
      _metric_names_hash: 'kubeletstats.volume',
      resource: {
        schema_url: SCHEMA_URL,
        attributes: {
          ...podAttributes(pod),
          'k8s.volume.name': volume.name,
          'k8s.volume.type': volume.type,
          'k8s.persistentvolumeclaim.name': volume.claim,
        },
      },
      scope: { name: 'otelcol/kubeletstatsreceiver', version: COLLECTOR_VERSION },
      metrics,
    },
    dynamicTemplates: metricTypes(metrics, Object.keys(metrics)),
  };
};

export const containerStateDoc = (
  pod: Pod,
  container: Container,
  restarts: number,
  ready: boolean,
  timeMs: number,
  index: string,
  namespace: string
): BulkDoc => {
  const metrics: Record<string, number> = {
    'k8s.container.restarts': restarts,
    'k8s.container.ready': ready ? 1 : 0,
    'k8s.container.cpu_limit': container.cpuLimit,
    'k8s.container.cpu_request': round(container.cpuLimit / 4),
    'k8s.container.memory_limit': container.memLimit,
    'k8s.container.memory_request': Math.round(container.memLimit / 2),
  };

  return {
    index,
    doc: {
      '@timestamp': new Date(timeMs).toISOString(),
      ...dataStream('k8sclusterreceiver.otel', namespace),
      _metric_names_hash: 'k8scluster.container',
      resource: {
        schema_url: SCHEMA_URL,
        attributes: {
          ...podAttributes(pod),
          'k8s.container.name': container.name,
          'container.id': container.id,
          'container.image.name': container.image,
          'container.image.tags': container.imageTag,
        },
      },
      scope: { name: 'otelcol/k8sclusterreceiver', version: COLLECTOR_VERSION },
      metrics,
    },
    dynamicTemplates: metricTypes(metrics, [
      'k8s.container.restarts',
      'k8s.container.ready',
      'k8s.container.memory_limit',
      'k8s.container.memory_request',
    ]),
  };
};

export const deploymentStateDoc = (
  deployment: Deployment,
  available: number,
  timeMs: number,
  index: string,
  namespace: string
): BulkDoc => {
  const metrics: Record<string, number> = {
    'k8s.deployment.desired': deployment.desired,
    'k8s.deployment.available': available,
  };

  return {
    index,
    doc: {
      '@timestamp': new Date(timeMs).toISOString(),
      ...dataStream('k8sclusterreceiver.otel', namespace),
      _metric_names_hash: 'k8scluster.deployment',
      resource: {
        schema_url: SCHEMA_URL,
        attributes: {
          ...clusterAttributes(deployment.cluster),
          'k8s.namespace.name': deployment.namespace.name,
          'k8s.deployment.name': deployment.name,
          'k8s.deployment.uid': deployment.uid,
          'deployment.environment':
            deployment.namespace.name === 'staging' ? 'staging' : 'production',
          'deployment.environment.name':
            deployment.namespace.name === 'staging' ? 'staging' : 'production',
          ...cloudAttributes(deployment.cluster),
        },
      },
      scope: { name: 'otelcol/k8sclusterreceiver', version: COLLECTOR_VERSION },
      attributes: { 'demo.alert_status': available < deployment.desired ? 'active' : 'clear' },
      metrics,
    },
    dynamicTemplates: metricTypes(metrics, Object.keys(metrics)),
  };
};

const SEVERITY_NUMBERS: Record<string, number> = {
  TRACE: 1,
  DEBUG: 5,
  INFO: 9,
  WARN: 13,
  ERROR: 17,
  FATAL: 21,
};

export const logDoc = (
  pod: Pod,
  severity: string,
  message: string,
  statusCode: number | undefined,
  timeMs: number,
  index: string,
  /** Stable across runs with the same seed, so a re-run does not duplicate logs. */
  key = `${pod.uid}:${timeMs}`
): BulkDoc => {
  const container = pod.containers[0];
  return {
    index,
    id: key,
    doc: {
      '@timestamp': new Date(timeMs).toISOString(),
      observed_timestamp: new Date(timeMs + 96).toISOString(),
      severity_text: severity,
      severity_number: SEVERITY_NUMBERS[severity] ?? 9,
      body: { text: message },
      resource: {
        schema_url: SCHEMA_URL,
        attributes: {
          ...podAttributes(pod),
          'k8s.container.name': container.name,
          'container.id': container.id,
        },
      },
      scope: { name: 'otelcol/filelogreceiver', version: COLLECTOR_VERSION },
      attributes: {
        'log.iostream': severity === 'ERROR' || severity === 'FATAL' ? 'stderr' : 'stdout',
        'log.file.path': `/var/log/pods/${pod.namespace.name}_${pod.name}_${pod.uid}/${container.name}/0.log`,
        'log.level': severity.toLowerCase(),
        'demo.scenario': pod.scenario,
        ...(statusCode ? { 'http.response.status_code': statusCode } : {}),
      },
    },
  };
};

export const alertStatusDoc = (
  pod: Pod,
  health: PodHealth,
  timeMs: number,
  index: string
): BulkDoc => ({
  index,
  // Keyed by pod so a re-run refreshes health in place rather than joining twice.
  id: pod.uid,
  op: 'index',
  doc: {
    entity_id: pod.uid,
    entity_type: 'pod',
    entity_name: pod.name,
    alert_status: health.status,
    active_alert_count: health.activeAlerts,
    rule_count: health.ruleCount,
    highest_severity: health.severity,
    last_alert_at: health.activeAlerts > 0 ? new Date(timeMs - 2_460_000).toISOString() : null,
    reason: health.reason,
    'k8s.cluster.name': pod.cluster.name,
    'k8s.namespace.name': pod.namespace.name,
    'k8s.node.name': pod.node.name,
    'k8s.deployment.name': pod.deployment.name,
    'deployment.environment': pod.environment,
    'cloud.region': pod.cluster.region,
  },
});
