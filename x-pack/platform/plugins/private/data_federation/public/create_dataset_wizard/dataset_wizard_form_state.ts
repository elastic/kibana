/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSetWithName } from '../../common';
import type { CreateDatasetFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import {
  dataSetToFlyoutFormValues,
  emptyDatasetFlyoutFormValues,
} from '../create_dataset_flyout/dataset_flyout_initial_values';

export interface DatasetWizardFormValues extends CreateDatasetFormValues {
  /** Prototype-only field; not persisted to the API yet. */
  region: string;
}

export const emptyDatasetWizardFormValues = (): DatasetWizardFormValues => ({
  ...emptyDatasetFlyoutFormValues(),
  region: '',
});

export const dataSetToWizardFormValues = (data: DataSetWithName): DatasetWizardFormValues => ({
  ...dataSetToFlyoutFormValues(data),
  region: '',
});
