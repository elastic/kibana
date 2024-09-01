/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core-http-browser';
import {
  IndicesGetMappingIndexMappingRecord,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import { v4 as uuidv4 } from 'uuid';

import { getUnallowedValueRequestItems } from './get_unallowed_value_request_items';
import * as i18n from '../translations';
import type {
  OnCheckCompleted,
  PartitionedFieldMetadata,
  UnallowedValueCount,
  UnallowedValueSearchResult,
} from '../types';
import { fetchMappings } from './fetch_mappings';
import { fetchUnallowedValues, getUnallowedValues } from './fetch_unallowed_values';
import { EcsFlatTyped } from '../constants';
import { getMappingsProperties, getSortedPartitionedFieldMetadata } from './metadata';

export const EMPTY_PARTITIONED_FIELD_METADATA: PartitionedFieldMetadata = {
  all: [],
  custom: [],
  ecsCompliant: [],
  incompatible: [],
  sameFamily: [],
};

export interface CheckIndexProps {
  abortController: AbortController;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  httpFetch: HttpHandler;
  indexName: string;
  onCheckCompleted: OnCheckCompleted;
  pattern: string;
  onLoadMappingsSuccess?: (indexes: Record<string, IndicesGetMappingIndexMappingRecord>) => void;
  onLoadMappingsStart?: () => void;
  onLoadUnallowedValuesSuccess?: (searchResults: UnallowedValueSearchResult[]) => void;
  onLoadUnallowedValuesStart?: () => void;
  onStart?: () => void;
  onSuccess?: ({
    partitionedFieldMetadata,
    mappingsProperties,
    unallowedValues,
  }: {
    partitionedFieldMetadata: PartitionedFieldMetadata;
    mappingsProperties: Record<string, MappingProperty> | null;
    unallowedValues: Record<string, UnallowedValueCount[]>;
  }) => void;
  onError?: (error: unknown) => void;
  batchId?: string;
  checkAllStartTime?: number;
  isCheckAll?: boolean;
  isLastCheck?: boolean;
}

export async function checkIndex({
  abortController,
  formatBytes,
  formatNumber,
  httpFetch,
  indexName,
  onCheckCompleted,
  pattern,
  onLoadMappingsSuccess,
  onLoadMappingsStart,
  onLoadUnallowedValuesSuccess,
  onLoadUnallowedValuesStart,
  onStart,
  onSuccess,
  onError,
  isLastCheck = false,
  batchId = uuidv4(),
  checkAllStartTime = Date.now(),
  isCheckAll = false,
}: CheckIndexProps) {
  try {
    const startTime = Date.now();

    onStart?.();
    onLoadMappingsStart?.();
    const indexes = await fetchMappings({
      abortController,
      httpFetch,
      patternOrIndexName: indexName,
    });

    onLoadMappingsSuccess?.(indexes);

    const requestItems = getUnallowedValueRequestItems({
      ecsMetadata: EcsFlatTyped,
      indexName,
    });

    onLoadUnallowedValuesStart?.();
    const searchResults = await fetchUnallowedValues({
      abortController,
      httpFetch,
      indexName,
      requestItems,
    });

    onLoadUnallowedValuesSuccess?.(searchResults);

    const unallowedValues = getUnallowedValues({
      requestItems,
      searchResults,
    });

    const mappingsProperties = getMappingsProperties({
      indexes,
      indexName,
    });

    const partitionedFieldMetadata =
      getSortedPartitionedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        loadingMappings: false,
        mappingsProperties,
        unallowedValues,
      }) ?? EMPTY_PARTITIONED_FIELD_METADATA;

    onSuccess?.({
      partitionedFieldMetadata,
      mappingsProperties,
      unallowedValues,
    });
    if (!abortController.signal.aborted) {
      onCheckCompleted({
        checkAllStartTime,
        batchId,
        error: null,
        formatBytes,
        isCheckAll,
        formatNumber,
        indexName,
        partitionedFieldMetadata,
        pattern,
        requestTime: Date.now() - startTime,
        isLastCheck,
      });
    }
  } catch (error: unknown) {
    onError?.(error);

    if (!abortController.signal.aborted) {
      onCheckCompleted({
        checkAllStartTime,
        batchId,
        error:
          error instanceof Error ? error.message : i18n.AN_ERROR_OCCURRED_CHECKING_INDEX(indexName),
        formatBytes,
        formatNumber,
        isCheckAll,
        indexName,
        partitionedFieldMetadata: null,
        pattern,
        isLastCheck,
      });
    }
  }
}
