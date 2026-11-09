/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { esqlFixtureDocumentRequests } from './documents';
import { esqlFixtureIndicesCreateRequests } from './indices';
import { agentBuilderFixtureDocuments, agentBuilderFixtureIndices } from './agent_builder_indices';
import { syntheticFixtureDocuments } from './synthetic_documents';

/**
 * Create every fixture index the anchor dataset's gold queries target and seed them with enough
 * documents that result equivalence can distinguish a right query from a wrong one.
 *
 * Idempotent: existing indices are left alone, documents are written with deterministic ids.
 */
/** Every index the corpus generator may synthesize queries against. */
export const corpusIndices: string[] = [
  'logs-production.evaluations.2025.01.01',
  'postgres-logs-production.evaluations.2025.01.01',
  'packetbeat-production.evaluations.2025.01.01',
  'nyc_taxis-production.evaluations.2025.01.01',
  'metricbeat-production.evaluations-2025.01.01',
  'employees-production.evaluations.2025.01.01',
  'users',
  'projects',
  'error_rate_daily',
  // Shipped sample data: real-ish business, geo/temporal and web-log shapes, installed with
  // `node scripts/esql_harness_opt.js setup-fixtures --sample-data`.
  'kibana_sample_data_ecommerce',
  'kibana_sample_data_flights',
  'kibana_sample_data_logs',
];

/** Install the shipped sample data sets through Kibana, so the corpus is not only our fixtures. */
export const installSampleData = async ({
  kibanaUrl,
  username,
  password,
  log,
}: {
  kibanaUrl: string;
  username: string;
  password: string;
  log: ToolingLog;
}): Promise<void> => {
  for (const id of ['ecommerce', 'flights', 'logs']) {
    const response = await fetch(`${kibanaUrl}/api/sample_data/${id}`, {
      method: 'POST',
      headers: {
        'kbn-xsrf': 'harness-opt',
        // The sample-data API is an internal route in this deployment shape.
        'x-elastic-internal-origin': 'Kibana',
        authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
    });
    log.info(`[harness-opt] sample data ${id}: ${response.status}`);
  }
};

/**
 * Enrich policies two of the anchor gold queries depend on.
 *
 * Without them those examples could never execute, so they scored on syntax alone and silently
 * stopped testing the thing they were written to test — ENRICH is a surface the harness has no
 * other coverage for.
 */
const setupEnrichPolicies = async ({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> => {
  const policies: Array<{
    name: string;
    index: string;
    matchField: string;
    enrichFields: string[];
    mappings: MappingTypeMapping;
    documents: Array<Record<string, unknown>>;
  }> = [
    {
      name: 'win_events',
      index: 'win_events_lookup',
      matchField: 'event.code',
      enrichFields: ['EVENT_DESCRIPTION'],
      mappings: {
        properties: {
          'event.code': { type: 'long' },
          EVENT_DESCRIPTION: { type: 'keyword' },
        },
      },
      documents: [
        { 'event.code': 4624, EVENT_DESCRIPTION: 'An account was successfully logged on' },
        { 'event.code': 4625, EVENT_DESCRIPTION: 'An account failed to log on' },
        { 'event.code': 4688, EVENT_DESCRIPTION: 'A new process has been created' },
      ],
    },
    {
      name: 'ldap_lookup_new',
      index: 'ldap_lookup',
      matchField: 'user.name',
      enrichFields: ['group.name'],
      mappings: {
        properties: {
          'user.name': { type: 'keyword' },
          'group.name': { type: 'keyword' },
        },
      },
      documents: [
        { 'user.name': 'alice', 'group.name': 'admins' },
        { 'user.name': 'bob', 'group.name': 'devs' },
        { 'user.name': 'carol', 'group.name': 'ops' },
        { 'user.name': 'dan', 'group.name': 'devs' },
      ],
    },
  ];

  for (const policy of policies) {
    await esClient.indices.delete({ index: policy.index }, { ignore: [404] });
    await esClient.indices.create({ index: policy.index, mappings: policy.mappings });
    await esClient.bulk({
      operations: policy.documents.flatMap((document) => [
        { index: { _index: policy.index } },
        document,
      ]),
      refresh: true,
    });
    await esClient.enrich.deletePolicy({ name: policy.name }).catch(() => undefined);
    await esClient.enrich.putPolicy({
      name: policy.name,
      match: {
        indices: policy.index,
        match_field: policy.matchField,
        enrich_fields: policy.enrichFields,
      },
    });
    await esClient.enrich.executePolicy({ name: policy.name, wait_for_completion: true });
    log.info(`[harness-opt] enrich policy ${policy.name} ready`);
  }
};

export const setupFixtures = async ({
  esClient,
  log,
}: {
  esClient: EsClient;
  log: ToolingLog;
}): Promise<void> => {
  const createRequests = [...esqlFixtureIndicesCreateRequests, ...agentBuilderFixtureIndices];
  log.info(`[harness-opt] creating ${createRequests.length} fixture indices`);

  for (const request of createRequests) {
    try {
      await esClient.indices.create(request);
    } catch (err) {
      const cause = err as { meta?: { body?: { error?: { type?: string } } } };
      if (cause?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        continue;
      }
      throw new Error(`[harness-opt] failed to create index "${request.index}"`, {
        cause: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  const documents = [
    ...esqlFixtureDocumentRequests,
    ...syntheticFixtureDocuments,
    ...agentBuilderFixtureDocuments,
  ];
  log.info(`[harness-opt] indexing ${documents.length} fixture documents`);

  const batchSize = 500;
  for (let offset = 0; offset < documents.length; offset += batchSize) {
    const batch = documents.slice(offset, offset + batchSize);
    const response = await esClient.bulk({
      // APM fixtures land in data streams, which only accept `create` ops; the rest carry a
      // deterministic id so re-running setup overwrites instead of duplicating.
      operations: batch.flatMap(({ index, id, document }) => [
        id ? { index: { _index: index, _id: id as string } } : { create: { _index: index } },
        document,
      ]),
    });
    if (response.errors) {
      const firstError = response.items.find((item) => item.index?.error ?? item.create?.error)
        ?.index?.error;
      throw new Error(`[harness-opt] fixture bulk index failed: ${JSON.stringify(firstError)}`);
    }
  }

  await esClient.indices.refresh({
    index: [...new Set([...createRequests, ...documents].map((request) => request.index))],
  });

  await setupEnrichPolicies({ esClient, log });
};
