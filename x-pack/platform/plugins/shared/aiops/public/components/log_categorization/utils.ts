/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringHash } from '@kbn/ml-string-hash';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { DocumentStats } from '../../hooks/use_document_count_stats';

/**
 * Creates a hash from the document stats to determine if the document stats have changed.
 */
export function createDocumentStatsHash(documentStats: DocumentStats) {
  const lastTimeStampMs = documentStats.documentCountStats?.lastDocTimeStampMs;
  const totalCount = documentStats.documentCountStats?.totalCount;
  const times = Object.keys(documentStats.documentCountStats?.buckets ?? {});
  const firstBucketTimeStamp = times.length ? times[0] : undefined;
  const lastBucketTimeStamp = times.length ? times[times.length - 1] : undefined;

  return stringHash(`${lastTimeStampMs}${totalCount}${firstBucketTimeStamp}${lastBucketTimeStamp}`);
}

export function createAdditionalConfigHash(additionalStrings: string[] = []) {
  return stringHash(`${additionalStrings.join('')}`);
}

/**
 * Retrieves the message field from a DataView object.
 * If the message field is not found, it falls back to error.message or event.original or the first text field in the DataView.
 *
 * @param dataView - The DataView object containing the fields.
 * @returns An object containing the message field and all the fields in the DataView.
 */
export function getMessageField(dataView: DataView): {
  messageField: DataViewField | null;
  dataViewFields: DataViewField[];
} {
  const dataViewFields = dataView.fields.filter((f) => f.esTypes?.includes(ES_FIELD_TYPES.TEXT));

  let messageField: DataViewField | null | undefined = dataViewFields.find(
    (f) => f.name === 'message'
  );
  if (messageField === undefined) {
    messageField = dataViewFields.find((f) => f.name === 'error.message');
  }
  if (messageField === undefined) {
    messageField = dataViewFields.find((f) => f.name === 'event.original');
  }
  if (messageField === undefined) {
    if (dataViewFields.length > 0) {
      messageField = dataViewFields[0];
    } else {
      messageField = null;
    }
  }
  return { messageField, dataViewFields };
}
