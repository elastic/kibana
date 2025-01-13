/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityDetailsPublicStateUpdate } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import * as rt from 'io-ts';
import { deepCompactObject } from '../../../common/utils/deep_compact_object';
import { datasetQualityDetailsUrlSchemaV1 } from '../../../common/url_schema';

export const getStateFromUrlValue = (
  urlValue: datasetQualityDetailsUrlSchemaV1.UrlSchema
): DatasetQualityDetailsPublicStateUpdate =>
  deepCompactObject<DatasetQualityDetailsPublicStateUpdate>({
    dataStream: urlValue.dataStream,
    timeRange: urlValue.timeRange,
    degradedFields: urlValue.degradedFields,
    breakdownField: urlValue.breakdownField,
    expandedDegradedField: urlValue.expandedDegradedField,
    showCurrentQualityIssues: urlValue.showCurrentQualityIssues,
  });

export const getUrlValueFromState = (
  state: DatasetQualityDetailsPublicStateUpdate
): datasetQualityDetailsUrlSchemaV1.UrlSchema =>
  deepCompactObject<datasetQualityDetailsUrlSchemaV1.UrlSchema>({
    dataStream: state.dataStream,
    timeRange: state.timeRange,
    degradedFields: state.degradedFields,
    breakdownField: state.breakdownField,
    expandedDegradedField: state.expandedDegradedField,
    showCurrentQualityIssues: state.showCurrentQualityIssues,
    v: 1,
  });

const stateFromUrlSchemaRT = new rt.Type<
  DatasetQualityDetailsPublicStateUpdate,
  datasetQualityDetailsUrlSchemaV1.UrlSchema,
  datasetQualityDetailsUrlSchemaV1.UrlSchema
>(
  'stateFromUrlSchemaRT',
  rt.never.is,
  (urlSchema, _context) => rt.success(getStateFromUrlValue(urlSchema)),
  getUrlValueFromState
);

export const stateFromUntrustedUrlRT =
  datasetQualityDetailsUrlSchemaV1.urlSchemaRT.pipe(stateFromUrlSchemaRT);
