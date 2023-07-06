/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IlmExplainLifecycleLifecycleExplain,
  IndicesGetMappingIndexMappingRecord,
  IndicesStatsIndicesStats,
} from '@elastic/elasticsearch/lib/api/types';
import type { Direction } from '@elastic/eui';

export interface Mappings {
  pattern: string;
  indexes: Record<string, IndicesGetMappingIndexMappingRecord>;
}

export interface AllowedValue {
  description?: string;
  expected_event_types?: string[];
  name?: string;
}

export interface EcsMetadata {
  allowed_values?: AllowedValue[];
  dashed_name?: string;
  description?: string;
  example?: string;
  flat_name?: string;
  format?: string;
  ignore_above?: number;
  level?: string;
  name?: string;
  normalize?: string[];
  required?: boolean;
  short?: string;
  type?: string;
}

export type EnrichedFieldMetadata = EcsMetadata & {
  hasEcsMetadata: boolean;
  indexFieldName: string;
  indexFieldType: string;
  indexInvalidValues: UnallowedValueCount[];
  isEcsCompliant: boolean;
  isInSameFamily: boolean;
};

export interface PartitionedFieldMetadata {
  all: EnrichedFieldMetadata[];
  custom: EnrichedFieldMetadata[];
  ecsCompliant: EnrichedFieldMetadata[];
  incompatible: EnrichedFieldMetadata[];
}

export interface PartitionedFieldMetadataStats {
  all: number;
  custom: number;
  ecsCompliant: number;
  incompatible: number;
}

export interface UnallowedValueRequestItem {
  allowedValues: string[];
  indexFieldName: string;
  indexName: string;
}

export interface Bucket {
  key: string;
  doc_count: number;
}

export interface UnallowedValueCount {
  fieldName: string;
  count: number;
}

export interface UnallowedValueSearchResult {
  aggregations?: {
    [x: string]: {
      buckets?: Bucket[];
    };
  };
}

export type IlmPhase = 'hot' | 'warm' | 'cold' | 'frozen' | 'unmanaged';

export interface IlmExplainPhaseCounts {
  hot: number;
  warm: number;
  cold: number;
  frozen: number;
  unmanaged: number;
}

export interface DataQualityCheckResult {
  docsCount: number | undefined;
  error: string | null;
  ilmPhase: IlmPhase | undefined;
  incompatible: number | undefined;
  indexName: string;
  markdownComments: string[];
  pattern: string;
}

export interface PatternRollup {
  docsCount: number | undefined;
  error: string | null;
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  ilmExplainPhaseCounts: IlmExplainPhaseCounts | undefined;
  indices: number | undefined;
  pattern: string;
  results: Record<string, DataQualityCheckResult> | undefined;
  sizeInBytes: number | undefined;
  stats: Record<string, IndicesStatsIndicesStats> | null;
}

export interface CheckIndexRequest {
  pattern: string;
  indexName: string;
}

export interface RequestQueueRequest<T> {
  topicId: string;
  request: T;
}

export interface RequestQueueResponse<T, U> {
  topicId: string;
  request: T;
  response: U;
}

export interface IndexToCheck {
  pattern: string;
  indexName: string;
}

export type OnCheckCompleted = ({
  error,
  formatBytes,
  formatNumber,
  indexName,
  partitionedFieldMetadata,
  pattern,
  version,
}: {
  error: string | null;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata | null;
  pattern: string;
  version: string;
}) => void;

export interface ErrorSummary {
  error: string;
  indexName: string | null;
  pattern: string;
}

export interface SortConfig {
  sort: {
    direction: Direction;
    field: string;
  };
}

export interface SelectedIndex {
  indexName: string;
  pattern: string;
}
