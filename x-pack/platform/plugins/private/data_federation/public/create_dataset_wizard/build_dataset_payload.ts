/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSetWithName } from '../../common';
import { buildDatasetMappings } from '../components/mapping_editor';
import {
  buildDatasetSettingsFromFormValues,
  type CreateDatasetFormValues,
} from './create_dataset_form_state';

export const buildDatasetPayload = (values: CreateDatasetFormValues): DataSetWithName => {
  const description = values.description?.trim();
  const settings = buildDatasetSettingsFromFormValues(values.settings);
  const mappings = buildDatasetMappings(values.mappings);

  return {
    name: values.name.trim(),
    data_source: values.data_source.trim(),
    resource: values.resource.trim(),
    ...(description ? { description } : {}),
    ...(settings ? { settings } : {}),
    ...(mappings ? { mappings } : {}),
  };
};
