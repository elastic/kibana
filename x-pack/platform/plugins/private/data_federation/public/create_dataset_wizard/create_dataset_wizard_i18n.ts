/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const createDatasetWizardStrings = {
  pageTitle: () =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.pageTitle', {
      defaultMessage: 'Add dataset',
    }),
  editPageTitle: (id: string) =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.editPageTitle', {
      defaultMessage: 'Edit dataset: {id}',
      values: { id },
    }),
  datasetStepLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.datasetStepLabel', {
      defaultMessage: 'Define dataset',
    }),
  advancedStepLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.advancedStepLabel', {
      defaultMessage: 'Advanced settings',
    }),
  reviewStepLabel: () =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.reviewStepLabel', {
      defaultMessage: 'Review',
    }),
  notSet: () =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.notSetValue', {
      defaultMessage: 'Not set',
    }),
  editButton: () =>
    i18n.translate('xpack.dataFederation.createDatasetWizard.editButtonLabel', {
      defaultMessage: 'Edit',
    }),
};
