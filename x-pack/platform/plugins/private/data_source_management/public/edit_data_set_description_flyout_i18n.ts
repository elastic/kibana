/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const editDataSetDescriptionFlyoutStrings = {
  title: (datasetName: string) =>
    i18n.translate('dataSourceManagement.editDataSetDescriptionFlyout.title', {
      defaultMessage: 'Edit {dataset}',
      values: { dataset: datasetName },
    }),

  editActionDescription: () =>
    i18n.translate('dataSourceManagement.editDataSetDescriptionFlyout.editActionDescription', {
      defaultMessage: 'Edit this data set description',
    }),

  editTableActionName: () =>
    i18n.translate('dataSourceManagement.editDataSetDescriptionFlyout.editTableActionName', {
      defaultMessage: 'Edit',
    }),

  datasetIdLabel: () =>
    i18n.translate('dataSourceManagement.editDataSetDescriptionFlyout.datasetIdLabel', {
      defaultMessage: 'Dataset ID',
    }),

  sourceLabel: () =>
    i18n.translate('dataSourceManagement.editDataSetDescriptionFlyout.sourceLabel', {
      defaultMessage: 'Source',
    }),

  resourceLabel: () =>
    i18n.translate('dataSourceManagement.editDataSetDescriptionFlyout.resourceLabel', {
      defaultMessage: 'Resource',
    }),

  saveButton: () =>
    i18n.translate('dataSourceManagement.editDataSetDescriptionFlyout.saveButton', {
      defaultMessage: 'Save',
    }),
};
