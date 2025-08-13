/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityPublicStateUpdate } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality';
import * as rt from 'io-ts';
import { deepCompactObject } from '../../../common/utils/deep_compact_object';
import { datasetQualityUrlSchemaV2 } from '../../../common/url_schema';

export const getStateFromUrlValue = (
  urlValue: datasetQualityUrlSchemaV2.UrlSchema
): DatasetQualityPublicStateUpdate =>
  deepCompactObject<DatasetQualityPublicStateUpdate>({
    table: urlValue.table,
    filters: urlValue.filters,
  });

export const getUrlValueFromState = (
  state: DatasetQualityPublicStateUpdate
): datasetQualityUrlSchemaV2.UrlSchema =>
  deepCompactObject<datasetQualityUrlSchemaV2.UrlSchema>({
    table: state.table,
    filters: state.filters,
    v: 2,
  });

const stateFromUrlSchemaRT = new rt.Type<
  DatasetQualityPublicStateUpdate,
  datasetQualityUrlSchemaV2.UrlSchema,
  datasetQualityUrlSchemaV2.UrlSchema
>(
  'stateFromUrlSchemaRT',
  rt.never.is,
  (urlSchema, _context) => rt.success(getStateFromUrlValue(urlSchema)),
  getUrlValueFromState
);

export const stateFromUntrustedUrlRT =
  datasetQualityUrlSchemaV2.urlSchemaRT.pipe(stateFromUrlSchemaRT);
