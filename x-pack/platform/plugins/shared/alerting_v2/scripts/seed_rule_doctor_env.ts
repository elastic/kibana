/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ConnectionConfig } from '../../streams/scripts/seed_sigevents_env/lib/get_connection_config';
import { getConnectionConfig } from '../../streams/scripts/seed_sigevents_env/lib/get_connection_config';
import { kibanaRequest } from '../../streams/scripts/seed_sigevents_env/lib/kibana';

async function ensureStreamsEnabled(config: ConnectionConfig, log: ToolingLog): Promise<void> {
  const { status, data } = await kibanaRequest(config, 'POST', '/api/streams/_enable');
  if (status === 200) {
    log.info('Streams enabled successfully');
  } else if (status === 400) {
    const msg = JSON.stringify(data ?? '');
    if (msg.includes('already enabled') || msg.includes('Cannot change stream types')) {
      log.info('Streams already enabled');
    } else {
      throw new Error(`Failed to enable streams: ${status} ${msg}`);
    }
  } else if (status === 404) {
    log.warning('Streams API not available — skipping');
  } else {
    throw new Error(`Failed to enable streams: ${status} ${JSON.stringify(data)}`);
  }
}

const DATA_VIEWS = [
  // Logs
  {
    id: 'rule-doctor-dv-otel-logs',
    name: 'OTel Logs',
    title: 'remote_cluster:logs-*.otel-*',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-k8s-objects',
    name: 'K8s Object Logs',
    title: 'remote_cluster:logs-k8sobjectsreceiver.otel-default',
    timeFieldName: '@timestamp',
  },
  // APM / Service metrics
  {
    id: 'rule-doctor-dv-svc-transaction',
    name: 'Service Transaction Metrics',
    title: 'remote_cluster:metrics-service_transaction.1m.otel-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-svc-summary',
    name: 'Service Summary Metrics',
    title: 'remote_cluster:metrics-service_summary.1m.otel-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-svc-destination',
    name: 'Service Destination Metrics',
    title: 'remote_cluster:metrics-service_destination.1m.otel-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-transaction',
    name: 'Transaction Metrics',
    title: 'remote_cluster:metrics-transaction.1m.otel-default',
    timeFieldName: '@timestamp',
  },
  // Kubernetes metrics
  {
    id: 'rule-doctor-dv-k8s-cluster',
    name: 'K8s Cluster Metrics',
    title: 'remote_cluster:metrics-k8sclusterreceiver.otel-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-k8s-kubelet',
    name: 'K8s Kubelet Metrics',
    title: 'remote_cluster:metrics-kubeletstatsreceiver.otel-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-k8s-pod',
    name: 'K8s Pod Metrics',
    title: 'remote_cluster:metrics-kubernetes.pod-default',
    timeFieldName: '@timestamp',
  },
  // Host / system metrics
  {
    id: 'rule-doctor-dv-host-metrics',
    name: 'Host Metrics (OTel)',
    title: 'remote_cluster:metrics-hostmetricsreceiver.otel-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-system-cpu',
    name: 'System CPU Metrics',
    title: 'remote_cluster:metrics-system.cpu-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-system-memory',
    name: 'System Memory Metrics',
    title: 'remote_cluster:metrics-system.memory-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-system-diskio',
    name: 'System Disk I/O Metrics',
    title: 'remote_cluster:metrics-system.diskio-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-system-filesystem',
    name: 'System Filesystem Metrics',
    title: 'remote_cluster:metrics-system.filesystem-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-system-network',
    name: 'System Network Metrics',
    title: 'remote_cluster:metrics-system.network-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-system-load',
    name: 'System Load Metrics',
    title: 'remote_cluster:metrics-system.load-default',
    timeFieldName: '@timestamp',
  },
  {
    id: 'rule-doctor-dv-system-process',
    name: 'System Process Metrics',
    title: 'remote_cluster:metrics-system.process-default',
    timeFieldName: '@timestamp',
  },
  // Generic OTel metrics
  {
    id: 'rule-doctor-dv-generic-metrics',
    name: 'Generic OTel Metrics',
    title: 'remote_cluster:metrics-generic.otel-default',
    timeFieldName: '@timestamp',
  },
];

const CLASSIC_STREAMS = [
  {
    name: 'logs.otel',
    description: 'OTel logs classic stream for Rule Doctor demo',
  },
];

async function createClassicStream(
  config: ConnectionConfig,
  stream: { name: string; description: string },
  log: ToolingLog
): Promise<void> {
  const { status, data } = await kibanaRequest(config, 'POST', '/internal/streams/_create_classic', {
    name: stream.name,
    description: stream.description,
    ingest: {
      processing: { steps: [] },
      lifecycle: { inherit: {} },
      settings: {},
      failure_store: { inherit: {} },
      classic: {},
    },
  });

  if (status === 200) {
    log.info(`Created classic stream: ${stream.name}`);
  } else {
    const msg = JSON.stringify(data ?? '');
    if (
      status === 409 ||
      (status === 400 && msg.includes('already')) ||
      (status === 422 && msg.includes('Cannot change stream types'))
    ) {
      log.info(`Stream already exists: ${stream.name} (may be wired — that's fine)`);
    } else {
      log.warning(
        `Failed to create classic stream ${stream.name}: ${status} ${msg}`
      );
    }
  }
}

async function deleteClassicStream(
  config: ConnectionConfig,
  streamName: string,
  log: ToolingLog
): Promise<void> {
  const { status } = await kibanaRequest(config, 'DELETE', `/api/streams/${streamName}`);
  if (status === 200) {
    log.info(`Deleted stream: ${streamName}`);
  } else if (status === 404) {
    log.debug(`Stream not found (already deleted): ${streamName}`);
  } else {
    log.warning(`Failed to delete stream ${streamName}: ${status}`);
  }
}

async function createDataView(
  config: ConnectionConfig,
  dv: { id: string; name: string; title: string; timeFieldName: string },
  space: string,
  log: ToolingLog
): Promise<void> {
  const basePath = space === 'default' ? '' : `/s/${space}`;
  const { status, data } = await kibanaRequest(
    config,
    'POST',
    `${basePath}/api/data_views/data_view`,
    {
      data_view: {
        id: dv.id,
        name: dv.name,
        title: dv.title,
        timeFieldName: dv.timeFieldName,
        allowNoIndex: true,
      },
    }
  );

  if (status === 200) {
    log.info(`Created data view: ${dv.name} (${dv.title})`);
  } else if (status === 400 && JSON.stringify(data ?? '').includes('Duplicate')) {
    log.info(`Data view already exists: ${dv.name}`);
  } else {
    log.warning(`Failed to create data view ${dv.name}: ${status} ${JSON.stringify(data)}`);
  }
}

async function deleteDataView(
  config: ConnectionConfig,
  dvId: string,
  space: string,
  log: ToolingLog
): Promise<void> {
  const basePath = space === 'default' ? '' : `/s/${space}`;
  const { status } = await kibanaRequest(
    config,
    'DELETE',
    `${basePath}/api/data_views/data_view/${dvId}`
  );
  if (status === 200) {
    log.info(`Deleted data view: ${dvId}`);
  } else if (status === 404) {
    log.debug(`Data view not found (already deleted): ${dvId}`);
  } else {
    log.warning(`Failed to delete data view ${dvId}: ${status}`);
  }
}

async function seedRules(config: ConnectionConfig, log: ToolingLog): Promise<void> {
  const { status, data } = await kibanaRequest(
    config,
    'POST',
    '/internal/alerting/v2/rule_doctor/_seed'
  );

  if (status === 200) {
    const body = data as { created?: string[] };
    log.info(`Seeded ${body.created?.length ?? 0} rules`);
  } else {
    log.warning(`Failed to seed rules: ${status} ${JSON.stringify(data)}`);
  }
}

async function cleanAll(config: ConnectionConfig, space: string, log: ToolingLog): Promise<void> {
  log.info('Cleaning seeded data…');

  for (const dv of DATA_VIEWS) {
    await deleteDataView(config, dv.id, space, log);
  }

  for (const stream of CLASSIC_STREAMS) {
    await deleteClassicStream(config, stream.name, log);
  }
}

run(
  async ({ log, flags }) => {
    const config = await getConnectionConfig(flags, log);
    const space = String(flags.space || 'default');

    if (flags.clean === true) {
      await cleanAll(config, space, log);
      if (!flags.seed) {
        log.info('Clean complete. Pass --seed alongside --clean to re-seed after cleaning.');
        return;
      }
    }

    log.info('Enabling streams…');
    await ensureStreamsEnabled(config, log);

    log.info('Creating classic streams…');
    for (const stream of CLASSIC_STREAMS) {
      await createClassicStream(config, stream, log);
    }

    log.info('Creating data views…');
    for (const dv of DATA_VIEWS) {
      await createDataView(config, dv, space, log);
    }

    log.info('Seeding rules…');
    await seedRules(config, log);

    log.info('Done. Rule Doctor environment is ready.');
  },
  {
    description: 'Seed the Rule Doctor demo environment — creates streams, data views, and rules.',
    flags: {
      string: ['space', 'es-url', 'es-username', 'es-password', 'kibana-url'],
      boolean: ['clean', 'seed'],
      default: { seed: true },
      help: `
        --space <name>           Kibana space (default: default)
        --clean                  Delete seeded data views and streams before re-creating
        --seed                   Re-seed after cleaning (default: true; use --no-seed with --clean for clean-only)
        --es-url <url>           Elasticsearch URL (default: from kibana.dev.yml)
        --es-username <user>     ES username (default: elastic)
        --es-password <pass>     ES password (default: changeme)
        --kibana-url <url>       Kibana base URL (default: from kibana.dev.yml, auto-detects dev base path)
      `,
    },
  }
);
