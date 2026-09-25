/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  MAX_LOOK_BACK,
  OPTIONAL_COMPONENT_TEMPLATES,
  OTEL_COMPONENT_TEMPLATES,
  alertIndexName,
  metricsTemplateName,
} from './config';

const REQUIRED_COMPONENT_TEMPLATES = OTEL_COMPONENT_TEMPLATES.filter(
  (name) => !OPTIONAL_COMPONENT_TEMPLATES.includes(name as never)
);

/**
 * The seed composes Elasticsearch's own `otel-data` component templates rather than
 * declaring mappings itself, so documents are indexed exactly as a real collector's
 * would be. Without the module there is nothing sensible to fall back to.
 */
export const assertOtelComponentTemplates = async (client: Client): Promise<void> => {
  const missing: string[] = [];
  for (const name of REQUIRED_COMPONENT_TEMPLATES) {
    const exists = await client.cluster.existsComponentTemplate({ name });
    if (!exists) missing.push(name);
  }
  if (missing.length > 0) {
    throw new Error(
      `This cluster is missing the OTel component templates ${missing.join(', ')}. ` +
        `They ship with the Elasticsearch "otel-data" module — check you are running a ` +
        `default-distribution Elasticsearch (node scripts/es snapshot --license trial).`
    );
  }
};

/**
 * Seeding on top of an existing seed silently doubles it. Documents only deduplicate
 * when a re-run lands in the same interval, because a later run anchors pod start
 * times and failure windows to a new `now` — which changes the TSDB `_tsid`, and so
 * the derived `_id`. Two copies of every pod means two hexagons per pod, so this is
 * a refusal rather than a warning.
 */
export const assertNotAlreadySeeded = async (client: Client, namespace: string): Promise<void> => {
  const existing = await client.indices.getDataStream(
    { name: `metrics-*.otel-${namespace}` },
    { ignore: [404] }
  );
  if ((existing.data_streams ?? []).length > 0) {
    throw new Error(
      `Namespace "${namespace}" already holds seeded data. Re-run with --clean to replace it, ` +
        `--append to add to it, or --namespace <other> to seed alongside it.`
    );
  }
};

export const ensureMetricsTemplate = async (
  client: Client,
  namespace: string,
  log: ToolingLog
): Promise<void> => {
  const name = metricsTemplateName(namespace);
  await client.indices.putIndexTemplate({
    name,
    index_patterns: [`metrics-*.otel-${namespace}`],
    // Above metrics-otel@template (120) and the APM OTel templates (up to 210), so
    // our look_back_time override actually applies.
    priority: 500,
    data_stream: {},
    composed_of: [...OTEL_COMPONENT_TEMPLATES],
    ignore_missing_component_templates: [...OPTIONAL_COMPONENT_TEMPLATES],
    template: {
      settings: {
        'index.mode': 'time_series',
        // Stock OTel metrics data streams only accept documents from the last 2h.
        // Backfilling a day of history needs this widened; 7d is the hard maximum
        // Elasticsearch allows.
        'index.look_back_time': MAX_LOOK_BACK,
        'index.number_of_replicas': 0,
        'index.number_of_shards': 1,
      },
    },
    _meta: {
      managed_by: 'custom_apps k8s_otel_data',
      description: 'Kubernetes OTel sample data for the Custom Apps prototype',
    },
  });
  log.debug(`Index template ${name} is in place`);
};

export const ensureAlertIndex = async (
  client: Client,
  namespace: string,
  log: ToolingLog
): Promise<void> => {
  const index = alertIndexName(namespace);
  if (await client.indices.exists({ index })) {
    log.debug(`Alert status index ${index} already exists`);
    return;
  }
  await client.indices.create({
    index,
    // `lookup` mode pins the index to one shard, which is what makes LOOKUP JOIN
    // against it cheap enough to run on every page load.
    settings: { 'index.mode': 'lookup' },
    mappings: {
      properties: {
        entity_id: { type: 'keyword' },
        entity_type: { type: 'keyword' },
        entity_name: { type: 'keyword' },
        alert_status: { type: 'keyword' },
        active_alert_count: { type: 'long' },
        rule_count: { type: 'long' },
        highest_severity: { type: 'keyword' },
        last_alert_at: { type: 'date' },
        reason: { type: 'keyword' },
        'k8s.cluster.name': { type: 'keyword' },
        'k8s.namespace.name': { type: 'keyword' },
        'k8s.node.name': { type: 'keyword' },
        'k8s.deployment.name': { type: 'keyword' },
        'deployment.environment': { type: 'keyword' },
        'cloud.region': { type: 'keyword' },
      },
    },
  });
  log.debug(`Created alert status index ${index}`);
};
