/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersection } from 'lodash';
import { from, of, Observable, concatMap, delay, map, toArray, forkJoin } from 'rxjs';
import {
  MappingPropertyBase,
  IndicesGetMappingResponse,
  IndicesStatsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { DataStreamFieldStatsPerNamespace, DatasetIndexPattern } from './types';

import {
  IndexBasicInfo,
  DataStreamStatsPerNamespace,
  DataStreamStats,
  DataTelemetryEvent,
} from './types';
import {
  DATA_TELEMETRY_FIELDS,
  LEVEL_2_RESOURCE_FIELDS,
  PROMINENT_LOG_ECS_FIELDS,
} from './constants';

/**
 * Retrieves all indices and data streams for each stream of logs.
 */
export function getAllIndices({
  esClient,
  logsIndexPatterns,
  excludeStreamsStartingWith,
  breatheDelay,
}: {
  esClient: ElasticsearchClient;
  logsIndexPatterns: DatasetIndexPattern[];
  excludeStreamsStartingWith: string[];
  breatheDelay: number; // Breathing time between each request to prioritize other cluster operations
}): Observable<IndexBasicInfo[]> {
  const uniqueIndices = new Set<string>();
  const indicesInfo: IndexBasicInfo[] = [];

  return from(logsIndexPatterns).pipe(
    concatMap((pattern) =>
      of(pattern).pipe(
        delay(breatheDelay),
        concatMap(() => {
          return forkJoin([
            from(getDataStreamsInfoForPattern({ esClient, pattern })),
            from(getIndicesInfoForPattern({ esClient, pattern })),
          ]);
        }),
        map(([patternDataStreamsInfo, patternIndicesInfo]) => {
          return [...patternDataStreamsInfo, ...patternIndicesInfo];
        }),
        map((indicesAndDataStreams) => {
          // Exclude indices that have already been dealt with
          return indicesAndDataStreams.filter((dataStream) => {
            return !uniqueIndices.has(dataStream.name);
          });
        }),
        map((indicesAndDataStreams) => {
          // Exclude internal or backing indices
          return indicesAndDataStreams.filter((dataStream) => !dataStream.name.startsWith('.'));
        }),
        map((indicesAndDataStreams) => {
          return indicesAndDataStreams.filter(
            // Exclude streams starting with non log known signals
            (dataStream) =>
              !excludeStreamsStartingWith.some((excludeStream) =>
                dataStream.name.startsWith(excludeStream)
              )
          );
        }),
        map((indicesAndDataStreams) => {
          indicesAndDataStreams.forEach((dataStream) => {
            uniqueIndices.add(dataStream.name);
          });
          return indicesAndDataStreams;
        }),
        map((dataStreamsInfoRecords) => {
          indicesInfo.push(...dataStreamsInfoRecords);
          return dataStreamsInfoRecords;
        })
      )
    ),
    toArray(),
    map(() => indicesInfo)
  );
}

/**
 * Retrieves the mappings at once and adds to the indices info.
 */
export function addMappingsToIndices({
  esClient,
  dataStreamsInfo,
  logsIndexPatterns,
}: {
  esClient: ElasticsearchClient;
  dataStreamsInfo: IndexBasicInfo[];
  logsIndexPatterns: DatasetIndexPattern[];
}): Observable<IndexBasicInfo[]> {
  return from(
    esClient.indices.getMapping({
      index: logsIndexPatterns.map((pattern) => pattern.pattern),
    })
  ).pipe(
    map((mappings) => {
      return dataStreamsInfo.map((info) => {
        // Add mapping for each index
        info.indices.forEach((index) => {
          if (mappings[index]) {
            info.mapping = { ...(info.mapping ?? {}), [index]: mappings[index] };
          }
        });

        return info;
      });
    })
  );
}

/**
 * Adds the namespace of the index from index mapping if available.
 */
export function addNamespace({
  dataStreamsInfo,
}: {
  dataStreamsInfo: IndexBasicInfo[];
}): Observable<IndexBasicInfo[]> {
  return from(dataStreamsInfo).pipe(
    concatMap((indexInfo) =>
      of(indexInfo).pipe(
        map((dataStream) => getIndexNamespace(dataStream)),
        map((namespace) => {
          indexInfo.namespace = namespace;
          return indexInfo;
        })
      )
    ),
    toArray()
  );
}

export function groupStatsByPatternName(
  dataStreamsStats: DataStreamFieldStatsPerNamespace[]
): DataStreamStats[] {
  const uniqueNamespaces = new Set<string>();
  const uniqueFields = new Set<string>();
  const statsByStream = dataStreamsStats.reduce<Map<string, DataStreamStats>>((acc, stats) => {
    if (!stats.patternName) {
      return acc;
    }

    if (!acc.get(stats.patternName)) {
      acc.set(stats.patternName, {
        streamName: stats.patternName,
        shipper: stats.shipper,
        totalNamespaces: 0,
        totalDocuments: 0,
        failureStoreDocuments: 0,
        failureStoreIndices: 0,
        totalSize: 0,
        totalIndices: 0,
        totalFields: 0,
        structureLevel: {},
        fieldsCount: {},
        managedBy: [],
        packageName: [],
        beat: [],
      });
    }

    const streamStats = acc.get(stats.patternName)!;

    // Track unique namespaces
    if (stats.namespace) {
      uniqueNamespaces.add(stats.namespace);
    }
    streamStats.totalNamespaces = uniqueNamespaces.size;

    // Track unique fields
    stats.uniqueFields.forEach((field) => uniqueFields.add(field));
    streamStats.totalFields = uniqueFields.size;

    // Aggregate structure levels
    for (const [level, count] of Object.entries(stats.structureLevel)) {
      streamStats.structureLevel[Number(level)] =
        (streamStats.structureLevel[Number(level)] ?? 0) + count;
    }

    streamStats.totalDocuments += stats.totalDocuments;
    streamStats.totalIndices += stats.totalIndices;
    streamStats.failureStoreDocuments += stats.failureStoreDocuments;
    streamStats.failureStoreIndices += stats.failureStoreIndices;
    streamStats.totalSize += stats.totalSize;

    for (const [field, count] of Object.entries(stats.fieldsCount)) {
      streamStats.fieldsCount[field] = (streamStats.fieldsCount[field] ?? 0) + count;
    }

    if (stats.meta?.managed_by) {
      streamStats.managedBy.push(stats.meta.managed_by);
    }

    if (stats.meta?.package?.name) {
      streamStats.packageName.push(stats.meta.package.name);
    }

    if (stats.meta?.beat) {
      streamStats.beat.push(stats.meta.beat);
    }

    return acc;
  }, new Map());

  return Array.from(statsByStream.values());
}

export function getIndexBasicStats({
  esClient,
  indices,
  breatheDelay,
}: {
  esClient: ElasticsearchClient;
  indices: IndexBasicInfo[];
  breatheDelay: number;
}): Observable<DataStreamStatsPerNamespace[]> {
  const indexNames = indices.map((info) => info.name);

  return from(
    esClient.indices.stats({
      index: indexNames,
    })
  ).pipe(
    delay(breatheDelay),
    concatMap((allIndexStats) => {
      return from(getFailureStoreStats({ esClient, indexName: indexNames.join(',') })).pipe(
        map((allFailureStoreStats) => {
          return indices.map((info) =>
            getIndexStats(allIndexStats.indices, allFailureStoreStats, info)
          );
        })
      );
    })
  );
}

export function getIndexFieldStats({
  basicStats,
}: {
  basicStats: DataStreamStatsPerNamespace[];
}): Observable<DataStreamFieldStatsPerNamespace[]> {
  return from(basicStats).pipe(
    map((stats) => getFieldStatsAndStructureLevels(stats, DATA_TELEMETRY_FIELDS)),
    toArray()
  );
}

export function indexStatsToTelemetryEvents(stats: DataStreamStats[]): DataTelemetryEvent[] {
  return stats.map((stat) => ({
    pattern_name: stat.streamName,
    shipper: stat.shipper,
    doc_count: stat.totalDocuments,
    structure_level: stat.structureLevel,
    index_count: stat.totalIndices,
    failure_store_doc_count: stat.failureStoreDocuments,
    failure_store_index_count: stat.failureStoreIndices,
    namespace_count: stat.totalNamespaces,
    field_count: stat.totalFields,
    field_existence: stat.fieldsCount,
    size_in_bytes: stat.totalSize,
    managed_by: Array.from(new Set(stat.managedBy)),
    package_name: Array.from(new Set(stat.packageName)),
    beat: Array.from(new Set(stat.beat)),
  }));
}

/**
 * Retrieves information about data streams matching a given pattern.
 */
async function getDataStreamsInfoForPattern({
  esClient,
  pattern,
}: {
  esClient: ElasticsearchClient;
  pattern: DatasetIndexPattern;
}): Promise<IndexBasicInfo[]> {
  const resp = await esClient.indices.getDataStream({
    name: pattern.pattern,
    expand_wildcards: 'all',
  });

  return resp.data_streams.map((dataStream) => ({
    patternName: pattern.patternName,
    shipper: pattern.shipper,
    isDataStream: true,
    name: dataStream.name,
    indices: dataStream.indices.map((index) => index.index_name),
    mapping: undefined,
    meta: dataStream._meta,
  }));
}

async function getIndicesInfoForPattern({
  esClient,
  pattern,
}: {
  esClient: ElasticsearchClient;
  pattern: DatasetIndexPattern;
}): Promise<IndexBasicInfo[]> {
  const resp = await esClient.indices.get({
    index: pattern.pattern,
  });

  return Object.entries(resp).map(([index, indexInfo]) => {
    // This is needed to keep the format same for data streams and indices
    const indexMapping: IndicesGetMappingResponse | undefined = indexInfo.mappings
      ? {
          [index]: { mappings: indexInfo.mappings },
        }
      : undefined;

    return {
      patternName: pattern.patternName,
      shipper: pattern.shipper,
      isDataStream: false,
      name: index,
      indices: [index],
      mapping: indexMapping,
      meta: indexInfo.mappings?._meta,
    };
  });
}

/**
 * Retrieves the namespace of index by checking the mappings of backing indices.
 *
 * @param {Object} indexInfo - The information about the index.
 * @returns {string | undefined} - The namespace of the data stream found in the mapping.
 */
function getIndexNamespace(indexInfo: IndexBasicInfo): string | undefined {
  for (let i = 0; i < indexInfo.indices.length; i++) {
    const index = indexInfo.indices[i];
    const indexMapping = indexInfo.mapping?.[index]?.mappings;
    const dataStreamMapping: MappingPropertyBase | undefined =
      indexMapping?.properties?.data_stream;
    if (!dataStreamMapping) {
      continue;
    }
    const namespace = (dataStreamMapping?.properties?.namespace as { value?: string })?.value;
    if (namespace) {
      return namespace;
    }
  }

  return undefined;
}

async function getFailureStoreStats({
  esClient,
  indexName,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
}): Promise<IndicesStatsResponse['indices']> {
  try {
    // TODO: Use the failure store API when it is available
    const resp = await esClient.transport.request<ReturnType<typeof esClient.indices.stats>>({
      method: 'GET',
      path: `/${indexName}/_stats`,
      querystring: {
        failure_store: 'only',
      },
    });

    return (await resp).indices;
  } catch (e) {
    // Failure store API may not be available
    return {};
  }
}

export function getIndexStats(
  allIndexStats: IndicesStatsResponse['indices'],
  allFailureStoreStats: IndicesStatsResponse['indices'],
  info: IndexBasicInfo
): DataStreamStatsPerNamespace {
  let totalDocs = 0;
  let totalSize = 0;
  let totalIndices = 0;
  const indexStats: IndicesStatsResponse['indices'] = {};
  let failureStoreDocs = 0;
  let failureStoreIndices = 0;
  const failureStoreStats: IndicesStatsResponse['indices'] = {};
  Object.entries(allIndexStats ?? {}).forEach(([indexName, stats]) => {
    if (indexName.includes(info.name)) {
      totalDocs += stats.primaries?.docs?.count ?? 0;
      totalSize += stats.primaries?.store?.size_in_bytes ?? 0;
      totalIndices++;

      indexStats[indexName] = stats;
    }
  });

  Object.entries(allFailureStoreStats ?? {}).forEach(([indexName, stats]) => {
    if (indexName.includes(info.name)) {
      failureStoreDocs += stats.primaries?.docs?.count ?? 0;
      failureStoreIndices++;

      failureStoreStats[indexName] = stats;
    }
  });

  return {
    patternName: info.patternName,
    shipper: info.shipper,
    namespace: info.namespace,
    totalDocuments: totalDocs,
    totalSize,
    totalIndices,
    failureStoreDocuments: failureStoreDocs,
    failureStoreIndices,
    meta: info.meta,
    mapping: info.mapping,
    indexStats,
    failureStoreStats,
  };
}

function getFieldStatsAndStructureLevels(
  stats: DataStreamStatsPerNamespace,
  fieldsToCheck: string[]
): DataStreamFieldStatsPerNamespace {
  const uniqueFields = new Set<string>();
  const structureLevel: Record<number, number> = {};

  // Loop through each index and get the number of fields and gather how many documents have that field
  const resourceFieldCounts: Record<string, number> = {};
  const indexNames = Object.keys(stats.indexStats ?? {});
  for (const backingIndex of indexNames) {
    const indexStats = stats.indexStats?.[backingIndex];
    const indexMapping = stats.mapping?.[backingIndex]?.mappings;
    if (!indexMapping) {
      continue;
    }

    // Get all fields from the mapping
    const indexFieldsMap = getFieldPathsMapFromMapping(indexMapping);
    const indexFieldsList = Object.keys(indexFieldsMap);
    indexFieldsList.forEach((field) => uniqueFields.add(field));

    const indexDocCount = indexStats?.primaries?.docs?.count ?? 0;
    if (!indexDocCount) {
      continue;
    }

    const indexStructureLevel = getStructureLevelForFieldsList(stats, indexFieldsMap);
    structureLevel[indexStructureLevel] =
      (structureLevel[indexStructureLevel] ?? 0) + indexDocCount;

    for (const field of fieldsToCheck) {
      if (indexFieldsMap[field]) {
        resourceFieldCounts[field] = (resourceFieldCounts[field] ?? 0) + indexDocCount;
      }
    }
  }

  return {
    ...stats,
    uniqueFields: Array.from(uniqueFields),
    structureLevel,
    fieldsCount: resourceFieldCounts,
  };
}

/**
 * Determines the structure level of log documents based on the fields present in the list.
 *
 * Structure Levels:
 * - Level 0: Unstructured data. No `@timestamp` or `timestamp` field.
 * - Level 1: Contains `@timestamp` or `timestamp` field.
 * - Level 2: Contains any of resource fields (`host.name`, `service.name`, `host`, `hostname`, `host_name`).
 * - Level 3: Contains `@timestamp`, resource fields, and `message` field.
 * - Level 4: Index name complies with a pattern of known shipper e.g. `logstash-*`, `heartbeat-*`.
 * - Level 5a: Data stream naming scheme exists (`data_stream.dataset`, `data_stream.type`, `data_stream.namespace`).
 * - Level 5b: Contains at least 3 ECS fields or `ecs.version` field.
 * - Level 6: Part of an integration, managed by a known entity.
 *
 * @param stats - Container pattern, shipper and meta info
 * @param fieldsMap - Dictionary/Map of fields present in the index with full path as key.
 * @returns {number} - The structure level of the index.
 */
function getStructureLevelForFieldsList(
  stats: DataStreamStatsPerNamespace,
  fieldsMap: Record<string, boolean>
): number {
  // Check level 1, if @timestamp or timestamp exists
  if (!fieldsMap['@timestamp'] && !fieldsMap.timestamp) {
    return 0;
  }

  // Check level 2, if resource fields exist
  if (!LEVEL_2_RESOURCE_FIELDS.some((field) => fieldsMap[field])) {
    return 1;
  }

  // Check level 3, if basic structure of log message exist
  if (
    !fieldsMap['@timestamp'] ||
    !fieldsMap.message ||
    (!fieldsMap['host.name'] && !fieldsMap['service.name'])
  ) {
    return 2;
  }

  // Check level 4 (Shipper is known)
  if (!stats.patternName || stats.patternName === 'generic-logs') {
    return 3;
  }

  // Check level 5a (Data stream scheme exists)
  if (
    !fieldsMap['data_stream.dataset'] ||
    !fieldsMap['data_stream.type'] ||
    !fieldsMap['data_stream.namespace']
  ) {
    // Check level 5b (ECS fields exist)
    const fieldsList = Object.keys(fieldsMap);
    if (
      !fieldsMap['ecs.version'] &&
      intersection(PROMINENT_LOG_ECS_FIELDS, fieldsList).length < 3
    ) {
      return 4;
    }
  }

  // Check level 6 (Index is managed)
  if (!stats.meta?.managed_by && !stats.meta?.managed) {
    return 5;
  }

  // All levels are fulfilled
  return 6;
}

/**
 * Recursively traverses a mapping and returns a dictionary of field paths.
 * Each key in the dictionary represents a full field path in dot notation.
 *
 * @param {MappingPropertyBase} mapping - The mapping to traverse.
 * @returns {Record<string, boolean>} - A dictionary of field paths.
 */
function getFieldPathsMapFromMapping(mapping: MappingPropertyBase): Record<string, boolean> {
  const fieldPathsMap: Record<string, boolean> = {};

  function traverseMapping(nestedMapping: MappingPropertyBase, parentField: string = ''): void {
    for (const [fieldName, field] of Object.entries(nestedMapping.properties ?? {})) {
      const fullFieldName = parentField ? `${parentField}.${fieldName}` : fieldName;
      if ((field as MappingPropertyBase).properties) {
        traverseMapping(field as MappingPropertyBase, fullFieldName);
      } else {
        fieldPathsMap[fullFieldName] = true;
      }
    }
  }

  traverseMapping(mapping);
  return fieldPathsMap;
}
