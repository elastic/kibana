/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import type {
  HousekeepingCheck,
  HousekeepingCheckFinding,
  HousekeepingContext,
} from '@kbn/housekeeping-plugin/server';
import { fetchLegacyTemplates, isManagedMeta } from './resource_provider';

const DAY_MS = 24 * 60 * 60 * 1000;

export const HOUSEKEEPING_THRESHOLDS = {
  /** A data stream without documents newer than this is reported as not receiving data. */
  noRecentDataDays: 30,
  /** An empty index older than this is reported. */
  emptyIndexDays: 7,
  /** Indices with more than one primary shard and less data per shard than this. */
  smallShardBytes: 1024 ** 3,
};

const READ_ONLY_BLOCK = 'index.blocks.read_only_allow_delete';
const REPLICAS = 'index.number_of_replicas';
const AUTO_EXPAND_REPLICAS = 'index.auto_expand_replicas';

const formatBytes = (bytes: number) => numeral(bytes).format('0.[0] b');

/** A request in Console syntax: the method and path, then the body. */
const consoleRequest = (line: string, body?: object) =>
  body ? `${line}\n${JSON.stringify(body, null, 2)}` : line;
const daysAgo = (timestamp: number) => Math.floor((Date.now() - timestamp) / DAY_MS);

const fetchDataStreams = ({ esClient, fetchOnce }: HousekeepingContext) =>
  fetchOnce('data_streams', (signal) =>
    esClient.indices.getDataStream({ name: '*', expand_wildcards: 'all' }, { signal })
  );

const fetchIndices = ({ esClient, fetchOnce }: HousekeepingContext) =>
  fetchOnce('cat_indices', (signal) =>
    esClient.cat.indices(
      {
        format: 'json',
        bytes: 'b',
        h: ['index', 'status', 'pri', 'docs.count', 'pri.store.size', 'creation.date'],
        expand_wildcards: 'all',
      },
      { signal }
    )
  );

const fetchIndexSettings = ({ esClient, fetchOnce }: HousekeepingContext) =>
  fetchOnce('index_check_settings', (signal) =>
    esClient.indices.getSettings(
      {
        index: '*',
        name: [READ_ONLY_BLOCK, REPLICAS, AUTO_EXPAND_REPLICAS],
        flat_settings: true,
        expand_wildcards: ['open', 'hidden'],
      },
      { signal }
    )
  );

/**
 * Index-level findings on a backing index belong to its data stream, which is what users manage.
 * Several backing indices with the same problem become one finding.
 */
const createIndexResolver = async (context: HousekeepingContext) => {
  const { data_streams: dataStreams } = await fetchDataStreams(context);
  const dataStreamByIndex = new Map(
    dataStreams.flatMap((dataStream) =>
      dataStream.indices.map(({ index_name: indexName }) => [indexName, dataStream] as const)
    )
  );
  return (index: string) => {
    const dataStream = dataStreamByIndex.get(index);
    return dataStream
      ? {
          type: 'data_stream',
          id: dataStream.name,
          isManaged: isManagedMeta(dataStream._meta) || dataStream.system === true,
        }
      : { type: 'index', id: index, isManaged: index.startsWith('.') };
  };
};

const uniqueByResource = (findings: HousekeepingCheckFinding[]) => [
  ...new Map(
    findings.map((finding) => [`${finding.resource.type}:${finding.resource.id}`, finding])
  ).values(),
];

export const dataStreamWithoutRetentionCheck: HousekeepingCheck = {
  id: 'index_management.data_stream_without_retention',
  kind: 'risk',
  title: i18n.translate('xpack.idxMgmt.housekeeping.noRetention.title', {
    defaultMessage: 'Data streams without retention',
  }),
  description: i18n.translate('xpack.idxMgmt.housekeeping.noRetention.description', {
    defaultMessage:
      'Nothing ever deletes the data of these data streams, so they keep growing. Set a data retention with the data stream lifecycle.',
  }),
  resourceTypes: ['data_stream'],

  async run(context) {
    const { data_streams: dataStreams } = await fetchDataStreams(context);
    return dataStreams
      .filter(
        ({ next_generation_managed_by: managedBy, lifecycle }) =>
          managedBy === 'Unmanaged' ||
          (managedBy === 'Data stream lifecycle' &&
            !lifecycle?.data_retention &&
            !lifecycle?.effective_retention)
      )
      .map((dataStream) => ({
        resource: {
          type: 'data_stream',
          id: dataStream.name,
          isManaged: isManagedMeta(dataStream._meta) || dataStream.system === true,
        },
        related: [],
        fix: {
          description: i18n.translate('xpack.idxMgmt.housekeeping.noRetention.fix', {
            defaultMessage:
              'Keeps 30 days of data with the data stream lifecycle. Change the retention to what you need before running it.',
          }),
          request: consoleRequest(`PUT _data_stream/${dataStream.name}/_lifecycle`, {
            data_retention: '30d',
          }),
        },
      }));
  },
};

export const dataStreamWithoutRecentDataCheck: HousekeepingCheck = {
  id: 'index_management.data_stream_without_recent_data',
  kind: 'unused',
  title: i18n.translate('xpack.idxMgmt.housekeeping.noRecentData.title', {
    defaultMessage: 'Data streams without recent data',
  }),
  description: i18n.translate('xpack.idxMgmt.housekeeping.noRecentData.description', {
    defaultMessage:
      'These data streams have no documents from the last {days} days. If the data is no longer needed, set a short retention with the data stream lifecycle or delete the data stream.',
    values: { days: HOUSEKEEPING_THRESHOLDS.noRecentDataDays },
  }),
  resourceTypes: ['data_stream'],

  async run(context) {
    const [{ data_streams: dataStreams }, stats] = await Promise.all([
      fetchDataStreams(context),
      context.esClient.indices.dataStreamsStats(
        { name: '*', expand_wildcards: 'all' },
        { signal: context.abortSignal }
      ),
    ]);
    const byName = new Map(dataStreams.map((dataStream) => [dataStream.name, dataStream]));

    return stats.data_streams.flatMap(
      ({ data_stream: name, maximum_timestamp: maximumTimestamp }): HousekeepingCheckFinding[] => {
        const dataStream = byName.get(name);
        const days = maximumTimestamp > 0 ? daysAgo(maximumTimestamp) : undefined;
        if (days !== undefined && days < HOUSEKEEPING_THRESHOLDS.noRecentDataDays) {
          return [];
        }
        return [
          {
            resource: {
              type: 'data_stream',
              id: name,
              isManaged:
                !dataStream || isManagedMeta(dataStream._meta) || dataStream.system === true,
            },
            related: [],
            details: [
              days === undefined
                ? i18n.translate('xpack.idxMgmt.housekeeping.noRecentData.empty', {
                    defaultMessage: 'No documents',
                  })
                : i18n.translate('xpack.idxMgmt.housekeeping.noRecentData.lastDocument', {
                    defaultMessage: 'Last document {days, plural, one {# day} other {# days}} ago',
                    values: { days },
                  }),
            ],
            fix: {
              description: i18n.translate('xpack.idxMgmt.housekeeping.noRecentData.fix', {
                defaultMessage:
                  'Deletes the data stream and all its documents. Take a snapshot first if you might need the data.',
              }),
              request: consoleRequest(`DELETE _data_stream/${name}`),
            },
            evidence: { maximumTimestamp },
          },
        ];
      }
    );
  },
};

export const emptyIndexCheck: HousekeepingCheck = {
  id: 'index_management.empty_index',
  kind: 'unused',
  title: i18n.translate('xpack.idxMgmt.housekeeping.emptyIndex.title', {
    defaultMessage: 'Empty indices',
  }),
  description: i18n.translate('xpack.idxMgmt.housekeeping.emptyIndex.description', {
    defaultMessage:
      'These indices were created more than {days} days ago and still have no documents. Delete the ones that nothing writes to.',
    values: { days: HOUSEKEEPING_THRESHOLDS.emptyIndexDays },
  }),
  resourceTypes: ['index'],

  async run(context) {
    const [indices, resolveIndex] = await Promise.all([
      fetchIndices(context),
      createIndexResolver(context),
    ]);
    return indices.flatMap((row): HousekeepingCheckFinding[] => {
      const resource = resolveIndex(row.index ?? '');
      const createdDaysAgo = daysAgo(Number(row['creation.date']));
      // Empty data streams are reported as data streams without recent data.
      if (
        resource.type !== 'index' ||
        row.status !== 'open' ||
        Number(row['docs.count']) !== 0 ||
        createdDaysAgo < HOUSEKEEPING_THRESHOLDS.emptyIndexDays
      ) {
        return [];
      }
      return [
        {
          resource,
          related: [],
          details: [
            i18n.translate('xpack.idxMgmt.housekeeping.emptyIndex.created', {
              defaultMessage: 'Created {days, plural, one {# day} other {# days}} ago',
              values: { days: createdDaysAgo },
            }),
          ],
          fix: {
            description: i18n.translate('xpack.idxMgmt.housekeeping.emptyIndex.fix', {
              defaultMessage: 'Deletes the empty index.',
            }),
            request: consoleRequest(`DELETE ${resource.id}`),
          },
        },
      ];
    });
  },
};

export const closedIndexCheck: HousekeepingCheck = {
  id: 'index_management.closed_index',
  kind: 'unused',
  title: i18n.translate('xpack.idxMgmt.housekeeping.closedIndex.title', {
    defaultMessage: 'Closed indices',
  }),
  description: i18n.translate('xpack.idxMgmt.housekeeping.closedIndex.description', {
    defaultMessage:
      'Closed indices still use disk, but nobody can search them. Delete them, or take a snapshot first if you might need the data again.',
  }),
  resourceTypes: ['index', 'data_stream'],

  async run(context) {
    const [indices, resolveIndex] = await Promise.all([
      fetchIndices(context),
      createIndexResolver(context),
    ]);
    return uniqueByResource(
      indices
        .filter((row) => row.status === 'close')
        .map((row) => {
          const resource = resolveIndex(row.index ?? '');
          return {
            resource,
            related: [],
            // A closed backing index goes with its data stream, through its retention.
            fix:
              resource.type === 'index'
                ? {
                    description: i18n.translate('xpack.idxMgmt.housekeeping.closedIndex.fix', {
                      defaultMessage:
                        'Deletes the index and its data. Take a snapshot first if you might need it.',
                    }),
                    request: consoleRequest(`DELETE ${resource.id}`),
                  }
                : undefined,
          };
        })
    );
  },
};

export const readOnlyIndexCheck: HousekeepingCheck = {
  id: 'index_management.read_only_index',
  kind: 'risk',
  title: i18n.translate('xpack.idxMgmt.housekeeping.readOnly.title', {
    defaultMessage: 'Indices blocked for writes',
  }),
  description: i18n.translate('xpack.idxMgmt.housekeeping.readOnly.description', {
    defaultMessage:
      'Elasticsearch blocks writes when a disk reaches the flood stage watermark, and the block stays after there is space again. Until you remove it, new documents are rejected.',
  }),
  resourceTypes: ['index', 'data_stream'],

  async run(context) {
    const [settings, resolveIndex] = await Promise.all([
      fetchIndexSettings(context),
      createIndexResolver(context),
    ]);
    return uniqueByResource(
      Object.entries(settings)
        .filter(([, { settings: values }]) => String(values?.[READ_ONLY_BLOCK]) === 'true')
        .map(([index]) => {
          const resource = resolveIndex(index);
          return {
            resource,
            related: [],
            details: [
              i18n.translate('xpack.idxMgmt.housekeeping.readOnly.detail', {
                defaultMessage: '{setting} is set to true.',
                values: { setting: READ_ONLY_BLOCK },
              }),
            ],
            fix: {
              description: i18n.translate('xpack.idxMgmt.housekeeping.readOnly.fix', {
                defaultMessage:
                  'Removes the write block. Check first that the nodes have free disk space, or Elasticsearch blocks writes again.',
              }),
              request: consoleRequest(`PUT ${resource.id}/_settings`, {
                [READ_ONLY_BLOCK]: null,
              }),
            },
          };
        })
    );
  },
};

export const unassignableReplicasCheck: HousekeepingCheck = {
  id: 'index_management.unassignable_replicas',
  kind: 'risk',
  title: i18n.translate('xpack.idxMgmt.housekeeping.replicas.title', {
    defaultMessage: "Replicas that can't be assigned",
  }),
  description: i18n.translate('xpack.idxMgmt.housekeeping.replicas.description', {
    defaultMessage:
      'These indices ask for more copies than the cluster has data nodes to hold them, so the cluster health stays yellow. Lower the number of replicas or add data nodes.',
  }),
  resourceTypes: ['index', 'data_stream'],
  // Serverless manages replicas.
  isAvailable: ({ isServerless }) => !isServerless,

  async run(context) {
    const [settings, resolveIndex, health] = await Promise.all([
      fetchIndexSettings(context),
      createIndexResolver(context),
      context.esClient.cluster.health({}, { signal: context.abortSignal }),
    ]);
    const dataNodes = health.number_of_data_nodes;

    return uniqueByResource(
      Object.entries(settings).flatMap(([index, { settings: values }]) => {
        const replicas = Number(values?.[REPLICAS] ?? 0);
        const autoExpand = values?.[AUTO_EXPAND_REPLICAS];
        if (replicas < dataNodes || (autoExpand && String(autoExpand) !== 'false')) {
          return [];
        }
        const resource = resolveIndex(index);
        return [
          {
            resource,
            related: [],
            fix: {
              description: i18n.translate('xpack.idxMgmt.housekeeping.replicas.fix', {
                defaultMessage:
                  'Lowers the replicas to what the data nodes can hold. Add data nodes instead if you need the extra copies.',
              }),
              request: consoleRequest(`PUT ${resource.id}/_settings`, {
                [REPLICAS]: Math.max(dataNodes - 1, 0),
              }),
            },
            details: [
              i18n.translate('xpack.idxMgmt.housekeeping.replicas.detail', {
                defaultMessage:
                  '{replicas, plural, one {# replica} other {# replicas}}, {nodes, plural, one {# data node} other {# data nodes}}',
                values: { replicas, nodes: dataNodes },
              }),
            ],
          },
        ];
      })
    );
  },
};

export const overshardedIndexCheck: HousekeepingCheck = {
  id: 'index_management.oversharded_index',
  kind: 'risk',
  title: i18n.translate('xpack.idxMgmt.housekeeping.oversharded.title', {
    defaultMessage: 'Too many shards for their size',
  }),
  description: i18n.translate('xpack.idxMgmt.housekeeping.oversharded.description', {
    defaultMessage:
      'Every shard costs memory and cluster state. These indices split little data across several primary shards, where one would be enough. Use one primary shard for new indices and shrink the existing ones.',
  }),
  resourceTypes: ['index', 'data_stream'],
  // Serverless manages shards.
  isAvailable: ({ isServerless }) => !isServerless,

  async run(context) {
    const [indices, resolveIndex] = await Promise.all([
      fetchIndices(context),
      createIndexResolver(context),
    ]);
    return uniqueByResource(
      indices.flatMap((row): HousekeepingCheckFinding[] => {
        const primaries = Number(row.pri);
        const size = Number(row['pri.store.size']);
        if (
          row.status !== 'open' ||
          primaries <= 1 ||
          size / primaries >= HOUSEKEEPING_THRESHOLDS.smallShardBytes
        ) {
          return [];
        }
        return [
          {
            resource: resolveIndex(row.index ?? ''),
            related: [],
            details: [
              i18n.translate('xpack.idxMgmt.housekeeping.oversharded.detail', {
                defaultMessage: '{primaries} primary shards for {size}',
                values: { primaries, size: formatBytes(size) },
              }),
            ],
          },
        ];
      })
    );
  },
};

export const legacyTemplateCheck: HousekeepingCheck = {
  id: 'index_management.legacy_index_template',
  kind: 'risk',
  title: i18n.translate('xpack.idxMgmt.housekeeping.legacyTemplate.title', {
    defaultMessage: 'Legacy index templates',
  }),
  description: i18n.translate('xpack.idxMgmt.housekeeping.legacyTemplate.description', {
    defaultMessage:
      'Legacy index templates are deprecated, and composable index templates take precedence over them. Move their settings and mappings to a composable index template.',
  }),
  resourceTypes: ['legacy_index_template'],
  isAvailable: ({ isServerless }) => !isServerless,

  async run(context) {
    const templates = await fetchLegacyTemplates(context);
    return Object.keys(templates).map((name) => ({
      resource: { type: 'legacy_index_template', id: name, isManaged: name.startsWith('.') },
      related: [],
    }));
  },
};

export const indexManagementChecks = [
  dataStreamWithoutRetentionCheck,
  dataStreamWithoutRecentDataCheck,
  emptyIndexCheck,
  closedIndexCheck,
  readOnlyIndexCheck,
  unassignableReplicasCheck,
  overshardedIndexCheck,
  legacyTemplateCheck,
];
