/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core-http-browser';
import { getUnallowedValueRequestItems } from '../../../allowed_values/helpers';
import {
  getMappingsProperties,
  getSortedPartitionedFieldMetadata,
} from '../../../index_properties/helpers';
import * as i18n from './translations';
import type { EcsMetadata, OnCheckCompleted, PartitionedFieldMetadata } from '../../../../types';
import { fetchMappings } from '../../../../use_mappings/helpers';
import { fetchUnallowedValues, getUnallowedValues } from '../../../../use_unallowed_values/helpers';

export const EMPTY_PARTITIONED_FIELD_METADATA: PartitionedFieldMetadata = {
  all: [],
  custom: [],
  ecsCompliant: [],
  incompatible: [],
  sameFamily: [],
};

export async function checkIndex({
  abortController,
  batchId,
  checkAllStartTime,
  ecsMetadata,
  formatBytes,
  formatNumber,
  httpFetch,
  indexName,
  isLastCheck,
  onCheckCompleted,
  pattern,
  version,
}: {
  abortController: AbortController;
  batchId: string;
  checkAllStartTime: number;
  ecsMetadata: Record<string, EcsMetadata> | null;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  httpFetch: HttpHandler;
  indexName: string;
  isLastCheck: boolean;
  onCheckCompleted: OnCheckCompleted;
  pattern: string;
  version: string;
}) {
  try {
    const startTime = Date.now();
    const indexes = await fetchMappings({
      abortController,
      httpFetch,
      patternOrIndexName: indexName,
    });

    const requestItems = getUnallowedValueRequestItems({
      ecsMetadata,
      indexName,
    });

    const searchResults = await fetchUnallowedValues({
      abortController,
      httpFetch,
      indexName,
      requestItems,
    });

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
        ecsMetadata,
        loadingMappings: false,
        mappingsProperties,
        unallowedValues,
      }) ?? EMPTY_PARTITIONED_FIELD_METADATA;

    if (!abortController.signal.aborted) {
      onCheckCompleted({
        checkAllStartTime,
        batchId,
        error: null,
        formatBytes,
        formatNumber,
        indexName,
        partitionedFieldMetadata,
        pattern,
        requestTime: Date.now() - startTime,
        version,
        isLastCheck,
      });
    }
  } catch (error) {
    if (!abortController.signal.aborted) {
      onCheckCompleted({
        checkAllStartTime,
        batchId,
        error: error != null ? error.message : i18n.AN_ERROR_OCCURRED_CHECKING_INDEX(indexName),
        formatBytes,
        formatNumber,
        indexName,
        partitionedFieldMetadata: null,
        pattern,
        version,
        isLastCheck,
      });
    }
  }
}
