/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { DATA_SOURCE_DESCRIPTION_TYPE } from '../../../common/attachment_types';

const discoverDataSourcesSchema = z.object({
  pattern: z
    .string()
    .optional()
    .describe(
      'Index pattern to scan (e.g. "logs-*", "metrics-*", "remote_cluster:logs-*"). ' +
        'Supports cross-cluster search (CCS) patterns with a cluster prefix. Defaults to "*".'
    ),
  include_hidden: z
    .boolean()
    .optional()
    .describe('Include hidden and system indices (those starting with "."). Defaults to false.'),
  include_remote_clusters: z
    .boolean()
    .optional()
    .describe(
      'Automatically discover and scan configured remote clusters in addition to the local cluster. ' +
        'Defaults to true when the pattern does not already contain a cluster prefix.'
    ),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of data sources to return per page. Defaults to 10.'),
  offset: z
    .number()
    .optional()
    .describe('Number of data sources to skip (for pagination). Defaults to 0.'),
});

interface DataSourceEntry {
  name: string;
  type: 'index' | 'data_stream' | 'alias';
  docCount: number;
  cluster?: string;
  backingIndices?: number;
}

const localPart = (name: string): string =>
  name.includes(':') ? name.split(':').slice(1).join(':') : name;

const clusterOf = (name: string): string | undefined =>
  name.includes(':') ? name.split(':')[0] : undefined;

const isHidden = (name: string): boolean => localPart(name).startsWith('.');

export const discoverDataSourcesTool = (): BuiltinToolDefinition<
  typeof discoverDataSourcesSchema
> => ({
  id: `${internalNamespaces.alertingV2}.discover_data_sources`,
  type: ToolType.builtin,
  description:
    'Scan for available indices, data streams, and aliases across local and remote clusters. ' +
    'Automatically detects cross-cluster search (CCS) configurations and returns CCS-prefixed ' +
    'names that can be passed directly to describe_data_source. Returns a ranked inventory ' +
    'sorted by document count. Creates an inline attachment card for each data source — ' +
    'use the <render_attachment> tags from _renderInstructions to display them in the chat.',
  tags: ['alerting'],
  schema: discoverDataSourcesSchema,
  handler: async (
    {
      pattern,
      include_hidden: includeHidden,
      include_remote_clusters: includeRemote,
      limit,
      offset,
    },
    { esClient, events, attachments }
  ) => {
    events.reportProgress('Scanning for data sources...');

    const effectivePattern = pattern ?? '*';
    const effectiveLimit = limit ?? 10;
    const effectiveOffset = offset ?? 0;
    const hasExplicitCluster = effectivePattern.includes(':');

    const patterns = [effectivePattern];
    let remoteClusters: string[] = [];

    if (!hasExplicitCluster && includeRemote !== false) {
      try {
        const remoteInfo = await esClient.asCurrentUser.cluster.remoteInfo();
        remoteClusters = Object.keys(remoteInfo);
        for (const cluster of remoteClusters) {
          patterns.push(`${cluster}:${effectivePattern}`);
        }
      } catch {
        // CCS not configured — proceed with local only
      }
    }

    events.reportProgress(
      remoteClusters.length > 0
        ? `Scanning local cluster and ${remoteClusters.length} remote cluster(s)...`
        : 'Scanning local cluster...'
    );

    const resolved = await esClient.asCurrentUser.indices.resolveIndex({
      name: patterns.join(','),
      expand_wildcards: includeHidden ? 'all' : 'open',
    });

    const dataStreamNames = new Set<string>();
    const dataStreamMeta = new Map<string, { backingIndices: number }>();

    for (const ds of resolved.data_streams ?? []) {
      if (!includeHidden && isHidden(ds.name)) continue;
      dataStreamNames.add(ds.name);
      dataStreamMeta.set(ds.name, {
        backingIndices: (ds.backing_indices ?? []).length,
      });
    }

    const standaloneIndices: string[] = [];
    for (const idx of resolved.indices ?? []) {
      if (dataStreamNames.has(idx.name)) continue;
      if ((idx as Record<string, unknown>).data_stream) continue;
      if (!includeHidden && isHidden(idx.name)) continue;
      standaloneIndices.push(idx.name);
    }

    const aliasEntries: Array<{ name: string; indices: string[] }> = [];
    for (const alias of resolved.aliases ?? []) {
      if (!includeHidden && isHidden(alias.name)) continue;
      aliasEntries.push({ name: alias.name, indices: alias.indices ?? [] });
    }

    const allNames = [
      ...Array.from(dataStreamNames),
      ...standaloneIndices,
      ...aliasEntries.map((a) => a.name),
    ];

    if (allNames.length === 0) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              dataSources: [],
              total: 0,
              remoteClusters: remoteClusters.length > 0 ? remoteClusters : undefined,
            },
          },
        ],
      };
    }

    events.reportProgress(`Counting documents across ${allNames.length} data source(s)...`);

    const countResults = await Promise.allSettled(
      allNames.map((name) =>
        esClient.asCurrentUser
          .count({ index: name, ignore_unavailable: true })
          .then((r) => ({ name, count: r.count }))
      )
    );

    const docCounts = new Map<string, number>();
    for (const result of countResults) {
      if (result.status === 'fulfilled') {
        docCounts.set(result.value.name, result.value.count);
      }
    }

    const dataSources: DataSourceEntry[] = [];

    for (const dsName of dataStreamNames) {
      dataSources.push({
        name: dsName,
        type: 'data_stream',
        docCount: docCounts.get(dsName) ?? 0,
        cluster: clusterOf(dsName),
        backingIndices: dataStreamMeta.get(dsName)?.backingIndices,
      });
    }

    for (const idxName of standaloneIndices) {
      dataSources.push({
        name: idxName,
        type: 'index',
        docCount: docCounts.get(idxName) ?? 0,
        cluster: clusterOf(idxName),
      });
    }

    for (const alias of aliasEntries) {
      dataSources.push({
        name: alias.name,
        type: 'alias',
        docCount: docCounts.get(alias.name) ?? 0,
        cluster: clusterOf(alias.name),
      });
    }

    dataSources.sort((a, b) => b.docCount - a.docCount);

    const total = dataSources.length;
    const page = dataSources.slice(effectiveOffset, effectiveOffset + effectiveLimit);
    const hasMore = effectiveOffset + page.length < total;

    events.reportProgress(`Creating attachment cards for ${page.length} data source(s)...`);

    const attachmentIds: Record<string, string> = {};
    for (const ds of page) {
      const att = await attachments.add({
        type: DATA_SOURCE_DESCRIPTION_TYPE,
        data: {
          index: ds.name,
          timeRange: { start: 'now-24h', end: 'now' },
          esqlQuery: `FROM ${ds.name} | LIMIT 100`,
          schema: {},
          logPatterns: [],
          errorSamples: [],
          docCount: ds.docCount,
          dataSourceType: ds.type,
        },
        description: `Data source: ${ds.name}`,
      });
      attachmentIds[ds.name] = att.id;
    }

    const renderTags = page
      .map((ds) => `<render_attachment id="${attachmentIds[ds.name]}"/>`)
      .join('\n\n');

    const renderInstructions = [
      'IMPORTANT: You MUST start your response with ALL the render tags below, one per line, as the VERY FIRST LINES.',
      'Do NOT write any text before them. Each tag must be on its own line with a blank line between tags.',
      'After all tags, leave a blank line, then write your summary.',
      '',
      'Your response MUST start exactly like this:',
      '',
      renderTags,
      '',
      'Your cluster contains...',
    ].join('\n');

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            dataSources: page,
            attachmentIds,
            total,
            showing: {
              from: effectiveOffset + 1,
              to: effectiveOffset + page.length,
            },
            hasMore,
            remoteClusters: remoteClusters.length > 0 ? remoteClusters : undefined,
            _renderInstructions: `IMPORTANT: Render each data source as an interactive card by including these tags in your response:\n${renderInstructions}`,
          },
        },
      ],
    };
  },
});
