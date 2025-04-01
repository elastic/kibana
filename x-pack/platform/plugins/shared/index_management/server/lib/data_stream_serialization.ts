/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { LOGSDB_INDEX_MODE, STANDARD_INDEX_MODE } from '../../common/constants';
import { IndexMode } from '../../common/types/data_streams';
import type { DataStream, EnhancedDataStreamFromEs, Health } from '../../common';

export function deserializeDataStream(
  dataStreamFromEs: EnhancedDataStreamFromEs,
  isLogsdbEnabled: boolean
): DataStream {
  const {
    name,
    timestamp_field: timeStampField,
    indices,
    generation,
    status,
    template,
    ilm_policy: ilmPolicyName,
    store_size: storageSize,
    store_size_bytes: storageSizeBytes,
    maximum_timestamp: maxTimeStamp,
    metering_size_in_bytes: meteringStorageSizeBytes,
    metering_doc_count: meteringDocsCount,
    _meta,
    privileges,
    hidden,
    lifecycle,
    global_max_retention: globalMaxRetention,
    next_generation_managed_by: nextGenerationManagedBy,
    index_mode: indexMode,
  } = dataStreamFromEs;
  const meteringStorageSize =
    meteringStorageSizeBytes !== undefined
      ? new ByteSizeValue(meteringStorageSizeBytes).toString()
      : undefined;

  return {
    name,
    timeStampField,
    indices: indices.map(
      ({
        index_name: indexName,
        index_uuid: indexUuid,
        prefer_ilm: preferILM = false,
        managed_by: managedBy,
      }: {
        index_name: string;
        index_uuid: string;
        prefer_ilm?: boolean;
        managed_by?: string;
      }) => ({
        name: indexName,
        uuid: indexUuid,
        preferILM,
        managedBy,
      })
    ),
    generation,
    health: status.toLowerCase() as Health, // ES typically returns status in all-caps
    indexTemplateName: template,
    ilmPolicyName,
    storageSize,
    storageSizeBytes,
    maxTimeStamp,
    meteringStorageSize,
    meteringStorageSizeBytes,
    meteringDocsCount,
    _meta,
    privileges,
    hidden,
    lifecycle: {
      ...lifecycle,
      globalMaxRetention,
    },
    nextGenerationManagedBy,
    indexMode: (indexMode ??
      (isLogsdbEnabled && /^logs-[^-]+-[^-]+$/.test(name)
        ? LOGSDB_INDEX_MODE
        : STANDARD_INDEX_MODE)) as IndexMode,
  };
}

export function deserializeDataStreamList(
  dataStreamsFromEs: EnhancedDataStreamFromEs[],
  isLogsdbEnabled: boolean
): DataStream[] {
  return dataStreamsFromEs.map((dataStream) => deserializeDataStream(dataStream, isLogsdbEnabled));
}
