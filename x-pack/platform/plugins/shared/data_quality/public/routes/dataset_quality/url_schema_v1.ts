/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityPublicStateUpdate } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality';
import * as rt from 'io-ts';
import { deepCompactObject } from '../../../common/utils/deep_compact_object';
import { datasetQualityUrlSchemaV1 } from '../../../common/url_schema';

export const getStateFromUrlValue = (
  urlValue: datasetQualityUrlSchemaV1.UrlSchema
): DatasetQualityPublicStateUpdate =>
  deepCompactObject<DatasetQualityPublicStateUpdate>({
    table: urlValue.table,
    filters: urlValue.filters,
  });

export const getUrlValueFromState = (
  state: DatasetQualityPublicStateUpdate
): datasetQualityUrlSchemaV1.UrlSchema =>
  deepCompactObject<datasetQualityUrlSchemaV1.UrlSchema>({
    table: state.table,
    filters: state.filters,
    v: 1,
  });

const stateFromUrlSchemaRT = new rt.Type<
  DatasetQualityPublicStateUpdate,
  datasetQualityUrlSchemaV1.UrlSchema,
  datasetQualityUrlSchemaV1.UrlSchema
>(
  'stateFromUrlSchemaRT',
  rt.never.is,
  (urlSchema, _context) => rt.success(getStateFromUrlValue(urlSchema)),
  getUrlValueFromState
);

export const stateFromUntrustedUrlRT =
  datasetQualityUrlSchemaV1.urlSchemaRT.pipe(stateFromUrlSchemaRT);
