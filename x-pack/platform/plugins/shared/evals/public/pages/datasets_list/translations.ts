/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.evals.datasetsList.pageTitle', {
  defaultMessage: 'Datasets',
});

export const CREATE_DATASET_BUTTON = i18n.translate(
  'xpack.evals.datasetsList.createDatasetButton',
  {
    defaultMessage: 'Create dataset',
  }
);

export const CREATE_DATASET_MODAL_TITLE = i18n.translate(
  'xpack.evals.datasetsList.createDatasetModal.title',
  {
    defaultMessage: 'Create dataset',
  }
);

export const CREATE_DATASET_NAME_LABEL = i18n.translate(
  'xpack.evals.datasetsList.createDatasetModal.nameLabel',
  {
    defaultMessage: 'Name',
  }
);

export const CREATE_DATASET_DESCRIPTION_LABEL = i18n.translate(
  'xpack.evals.datasetsList.createDatasetModal.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

export const CREATE_DATASET_EXAMPLES_LABEL = i18n.translate(
  'xpack.evals.datasetsList.createDatasetModal.examplesLabel',
  {
    defaultMessage: 'Examples JSON',
  }
);

export const CREATE_DATASET_EXAMPLES_HELP_TEXT = i18n.translate(
  'xpack.evals.datasetsList.createDatasetModal.examplesHelpText',
  {
    defaultMessage: 'Paste a JSON array of objects with input, output, and metadata fields.',
  }
);

export const CREATE_DATASET_NAME_REQUIRED_ERROR = i18n.translate(
  'xpack.evals.datasetsList.createDatasetModal.nameRequiredError',
  {
    defaultMessage: 'Name is required.',
  }
);

export const CREATE_DATASET_EXAMPLES_PARSE_ERROR = (error: string) =>
  i18n.translate('xpack.evals.datasetsList.createDatasetModal.examplesParseError', {
    defaultMessage: 'Failed to parse examples JSON: {error}',
    values: { error },
  });

export const CREATE_DATASET_EXAMPLES_ARRAY_ERROR = i18n.translate(
  'xpack.evals.datasetsList.createDatasetModal.examplesArrayError',
  {
    defaultMessage: 'Examples JSON must be an array.',
  }
);

export const CREATE_DATASET_EXAMPLES_ITEM_OBJECT_ERROR = (itemNumber: number) =>
  i18n.translate('xpack.evals.datasetsList.createDatasetModal.examplesItemObjectError', {
    defaultMessage: 'Examples item {itemNumber} must be a JSON object.',
    values: { itemNumber },
  });

export const CREATE_DATASET_EXAMPLES_FIELD_OBJECT_ERROR = (
  itemNumber: number,
  fieldName: string,
  label: string
) =>
  i18n.translate('xpack.evals.datasetsList.createDatasetModal.examplesFieldObjectError', {
    defaultMessage: '{label} item {itemNumber} field "{fieldName}" must be a JSON object.',
    values: { label, itemNumber, fieldName },
  });

export const CREATE_DATASET_CANCEL_BUTTON = i18n.translate(
  'xpack.evals.datasetsList.createDatasetModal.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const CREATE_DATASET_SUBMIT_BUTTON = i18n.translate(
  'xpack.evals.datasetsList.createDatasetModal.submitButton',
  {
    defaultMessage: 'Create dataset',
  }
);

export const COLUMN_NAME = i18n.translate('xpack.evals.datasetsList.columns.name', {
  defaultMessage: 'Name',
});

export const COLUMN_DESCRIPTION = i18n.translate('xpack.evals.datasetsList.columns.description', {
  defaultMessage: 'Description',
});

export const COLUMN_EXAMPLES = i18n.translate('xpack.evals.datasetsList.columns.examples', {
  defaultMessage: 'Examples',
});

export const COLUMN_LAST_UPDATED = i18n.translate('xpack.evals.datasetsList.columns.lastUpdated', {
  defaultMessage: 'Last Updated',
});
