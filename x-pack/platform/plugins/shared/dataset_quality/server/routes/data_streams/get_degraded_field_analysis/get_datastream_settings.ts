/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';
import { toBoolean } from '../../../utils/to_boolean';

export interface DataStreamSettingResponse {
  nestedFieldLimit?: number;
  totalFieldLimit: number;
  ignoreDynamicBeyondLimit?: boolean;
  ignoreMalformed?: boolean;
  defaultPipeline?: string;
}

const DEFAULT_FIELD_LIMIT = 1000;
const DEFAULT_NESTED_FIELD_LIMIT = 50;

export async function getDataStreamSettings({
  datasetQualityESClient,
  dataStream,
  lastBackingIndex,
}: {
  datasetQualityESClient: DatasetQualityESClient;
  dataStream: string;
  lastBackingIndex: string;
}): Promise<DataStreamSettingResponse> {
  const settings = await datasetQualityESClient.settings({ index: dataStream });
  const setting = settings[lastBackingIndex]?.settings;
  const mappingsInsideSettings = setting?.index?.mapping;

  return {
    nestedFieldLimit: mappingsInsideSettings?.nested_fields?.limit
      ? Number(mappingsInsideSettings?.nested_fields?.limit)
      : DEFAULT_NESTED_FIELD_LIMIT,
    totalFieldLimit: mappingsInsideSettings?.total_fields?.limit
      ? Number(mappingsInsideSettings?.total_fields?.limit)
      : DEFAULT_FIELD_LIMIT,
    ignoreDynamicBeyondLimit: toBoolean(
      mappingsInsideSettings?.total_fields?.ignore_dynamic_beyond_limit
    ),
    ignoreMalformed: toBoolean(mappingsInsideSettings?.ignore_malformed),
    defaultPipeline: setting?.index?.default_pipeline,
  };
}
