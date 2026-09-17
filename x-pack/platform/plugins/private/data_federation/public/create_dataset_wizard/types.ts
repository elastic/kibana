/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateDatasetSettingsFormValues } from './create_dataset_form_state';

export interface DatasetWizardDatasetStep {
  name: string;
  description: string;
  data_source: string;
  resource: string;
  format: string;
  partition_detection: string;
}

export interface DatasetWizardContent {
  dataset: DatasetWizardDatasetStep;
  settings: CreateDatasetSettingsFormValues;
}

export type DatasetWizardSection = keyof DatasetWizardContent | 'review';
