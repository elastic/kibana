/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSetWithName, Dataset, DatasetSettings } from '../common';
import { getDataSetByIdApiPath } from '../common';

export interface DatasetRequest {
  method: 'PUT';
  path: string;
  body: Dataset;
}

const isEmptySettingValue = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const omitEmptySettingsFields = (settings: DatasetSettings): DatasetSettings =>
  Object.fromEntries(Object.entries(settings).filter(([, value]) => !isEmptySettingValue(value)));

export const buildDatasetRequestBody = ({
  data_source: dataSource,
  resource,
  description,
  settings,
  mappings,
}: DataSetWithName): Dataset => ({
  data_source: dataSource,
  resource,
  ...(description === undefined || description === null ? {} : { description }),
  ...(settings ? { settings: omitEmptySettingsFields(settings) } : {}),
  ...(mappings ? { mappings } : {}),
});

export const buildDatasetRequest = (dataSet: DataSetWithName): DatasetRequest => ({
  method: 'PUT',
  path: getDataSetByIdApiPath(dataSet.name.trim()),
  body: buildDatasetRequestBody(dataSet),
});
