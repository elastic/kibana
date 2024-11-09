/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchQuery, HttpHandler } from '@kbn/core-http-browser';
import { IToasts } from '@kbn/core-notifications-browser';

import {
  DataQualityCheckResult,
  DataQualityIndexCheckedParams,
  IncompatibleFieldMappingItem,
  IncompatibleFieldValueItem,
  PartitionedFieldMetadata,
  SameFamilyFieldItem,
  StorageResult,
} from '../../../types';
import { GET_INDEX_RESULTS_LATEST, POST_INDEX_RESULTS } from '../constants';
import { INTERNAL_API_VERSION } from '../../../constants';
import { GET_RESULTS_ERROR_TITLE, POST_RESULT_ERROR_TITLE } from '../../../translations';

export const formatStorageResult = ({
  result,
  report,
  partitionedFieldMetadata,
}: {
  result: DataQualityCheckResult;
  report: DataQualityIndexCheckedParams;
  partitionedFieldMetadata: PartitionedFieldMetadata;
}): StorageResult => {
  const incompatibleFieldMappingItems: IncompatibleFieldMappingItem[] = [];
  const incompatibleFieldValueItems: IncompatibleFieldValueItem[] = [];
  const sameFamilyFieldItems: SameFamilyFieldItem[] = [];

  partitionedFieldMetadata.incompatible.forEach((field) => {
    if (field.type !== field.indexFieldType) {
      incompatibleFieldMappingItems.push({
        fieldName: field.indexFieldName,
        expectedValue: field.type,
        actualValue: field.indexFieldType,
        description: field.description,
      });
    }

    if (field.indexInvalidValues.length > 0) {
      incompatibleFieldValueItems.push({
        fieldName: field.indexFieldName,
        expectedValues: field.allowed_values?.map((x) => x.name) ?? [],
        actualValues: field.indexInvalidValues.map((v) => ({ name: v.fieldName, count: v.count })),
        description: field.description,
      });
    }
  });

  partitionedFieldMetadata.sameFamily.forEach((field) => {
    sameFamilyFieldItems.push({
      fieldName: field.indexFieldName,
      expectedValue: field.type,
      actualValue: field.indexFieldType,
      description: field.description,
    });
  });

  return {
    batchId: report.batchId,
    indexName: result.indexName,
    indexPattern: result.pattern,
    isCheckAll: report.isCheckAll,
    checkedAt: result.checkedAt ?? Date.now(),
    docsCount: result.docsCount ?? 0,
    totalFieldCount: partitionedFieldMetadata.all.length,
    ecsFieldCount: partitionedFieldMetadata.ecsCompliant.length,
    customFieldCount: partitionedFieldMetadata.custom.length,
    incompatibleFieldCount: partitionedFieldMetadata.incompatible.length,
    incompatibleFieldMappingItems,
    incompatibleFieldValueItems,
    sameFamilyFieldCount: partitionedFieldMetadata.sameFamily.length,
    sameFamilyFields: report.sameFamilyFields ?? [],
    sameFamilyFieldItems,
    unallowedMappingFields: report.unallowedMappingFields ?? [],
    unallowedValueFields: report.unallowedValueFields ?? [],
    sizeInBytes: report.sizeInBytes ?? 0,
    ilmPhase: result.ilmPhase,
    markdownComments: result.markdownComments,
    ecsVersion: report.ecsVersion,
    indexId: report.indexId ?? '',
    error: result.error,
  };
};

export const formatResultFromStorage = ({
  storageResult,
  pattern,
}: {
  storageResult: StorageResult;
  pattern: string;
}): DataQualityCheckResult => ({
  docsCount: storageResult.docsCount,
  error: storageResult.error,
  ilmPhase: storageResult.ilmPhase,
  incompatible: storageResult.incompatibleFieldCount,
  indexName: storageResult.indexName,
  markdownComments: storageResult.markdownComments,
  sameFamily: storageResult.sameFamilyFieldCount,
  checkedAt: storageResult.checkedAt,
  pattern,
});

export async function postStorageResult({
  storageResult,
  httpFetch,
  toasts,
  abortController = new AbortController(),
}: {
  storageResult: StorageResult;
  httpFetch: HttpHandler;
  toasts: IToasts;
  abortController?: AbortController;
}): Promise<void> {
  try {
    await httpFetch<void>(POST_INDEX_RESULTS, {
      method: 'POST',
      signal: abortController.signal,
      version: INTERNAL_API_VERSION,
      body: JSON.stringify(storageResult),
    });
  } catch (err) {
    toasts.addError(err, { title: POST_RESULT_ERROR_TITLE });
  }
}

export interface GetStorageResultsOpts {
  pattern: string;
  httpFetch: HttpHandler;
  toasts: IToasts;
  abortController: AbortController;
  startTime?: string;
  endTime?: string;
}

export async function getStorageResults({
  pattern,
  httpFetch,
  toasts,
  abortController,
  startTime,
  endTime,
}: GetStorageResultsOpts): Promise<StorageResult[]> {
  try {
    const route = GET_INDEX_RESULTS_LATEST.replace('{pattern}', pattern);

    const query: HttpFetchQuery = {};

    if (startTime) {
      query.startDate = startTime;
    }
    if (endTime) {
      query.endDate = endTime;
    }

    const results = await httpFetch<StorageResult[]>(route, {
      method: 'GET',
      signal: abortController.signal,
      version: INTERNAL_API_VERSION,
      ...(Object.keys(query).length > 0 ? { query } : {}),
    });
    return results;
  } catch (err) {
    toasts.addError(err, { title: GET_RESULTS_ERROR_TITLE });
    return [];
  }
}
