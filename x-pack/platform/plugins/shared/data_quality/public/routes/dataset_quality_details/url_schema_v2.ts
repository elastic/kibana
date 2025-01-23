/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityDetailsPublicStateUpdate } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import * as rt from 'io-ts';
import { deepCompactObject } from '../../../common/utils/deep_compact_object';
import { datasetQualityDetailsUrlSchemaV2 } from '../../../common/url_schema';

export const getStateFromUrlValue = (
  urlValue: datasetQualityDetailsUrlSchemaV2.UrlSchema
): DatasetQualityDetailsPublicStateUpdate =>
  deepCompactObject<DatasetQualityDetailsPublicStateUpdate>({
    dataStream: urlValue.dataStream,
    timeRange: urlValue.timeRange,
    qualityIssues: urlValue.qualityIssues,
    breakdownField: urlValue.breakdownField,
    showCurrentQualityIssues: urlValue.showCurrentQualityIssues,
    qualityIssuesChart: urlValue.qualityIssuesChart,
    expandedQualityIssue: urlValue.expandedQualityIssue,
  });

export const getUrlValueFromState = (
  state: DatasetQualityDetailsPublicStateUpdate
): datasetQualityDetailsUrlSchemaV2.UrlSchema =>
  deepCompactObject<datasetQualityDetailsUrlSchemaV2.UrlSchema>({
    dataStream: state.dataStream,
    timeRange: state.timeRange,
    qualityIssues: state.qualityIssues,
    breakdownField: state.breakdownField,
    showCurrentQualityIssues: state.showCurrentQualityIssues,
    qualityIssuesChart: state.qualityIssuesChart,
    expandedQualityIssue: state.expandedQualityIssue,
    v: 2,
  });

const stateFromUrlSchemaRT = new rt.Type<
  DatasetQualityDetailsPublicStateUpdate,
  datasetQualityDetailsUrlSchemaV2.UrlSchema,
  datasetQualityDetailsUrlSchemaV2.UrlSchema
>(
  'stateFromUrlSchemaRT',
  rt.never.is,
  (urlSchema, _context) => rt.success(getStateFromUrlValue(urlSchema)),
  getUrlValueFromState
);

export const stateFromUntrustedUrlRT =
  datasetQualityDetailsUrlSchemaV2.urlSchemaRT.pipe(stateFromUrlSchemaRT);
