/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const datasetWizardStrings = {
  createPageTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.createPageTitle', {
      defaultMessage: 'Add dataset',
    }),

  editPageTitle: (datasetName: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.editPageTitle', {
      defaultMessage: 'Edit dataset: {datasetName}',
      values: { datasetName },
    }),

  backAriaLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.backAriaLabel', {
      defaultMessage: 'Back to datasets',
    }),

  stepLogistics: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.stepLogistics', {
      defaultMessage: 'Logistics',
    }),

  stepAdditionalSettings: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.stepAdditionalSettings', {
      defaultMessage: 'Additional settings',
    }),

  stepSchemaMappings: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.stepSchemaMappings', {
      defaultMessage: 'Schema mappings',
    }),

  stepReview: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.stepReview', {
      defaultMessage: 'Review',
    }),

  logisticsTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.logisticsTitle', {
      defaultMessage: 'Logistics',
    }),

  logisticsDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.logisticsDescription', {
      defaultMessage: 'Select the source and define which dataset you want added',
    }),

  dataSourceLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceLabel', {
      defaultMessage: 'Data source',
    }),

  dataSourcePlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourcePlaceholder', {
      defaultMessage: 'Select an existing data source or connect a new one',
    }),

  connectNewDataSource: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.connectNewDataSource', {
      defaultMessage: 'Connect new data source',
    }),

  datasetNameLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.datasetNameLabel', {
      defaultMessage: 'Dataset name',
    }),

  datasetNamePlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.datasetNamePlaceholder', {
      defaultMessage: 'e.g. my-dataset',
    }),

  datasetNameHelp: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.datasetNameHelp', {
      defaultMessage:
        'Unique name for use in queries. All lowercase, dash, underscore, and numbers are supported',
    }),

  descriptionLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.descriptionLabel', {
      defaultMessage: 'Description (optional)',
    }),

  descriptionPlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.descriptionPlaceholder', {
      defaultMessage: 'Type text',
    }),

  resourceLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.resourceLabel', {
      defaultMessage: 'Resource',
    }),

  resourcePlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.resourcePlaceholder', {
      defaultMessage: 'Type text',
    }),

  resourceHelp: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.resourceHelp', {
      defaultMessage: 'Path or identifier for the dataset resource',
    }),

  regionLabel: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.regionLabel', {
      defaultMessage: 'Region',
    }),

  regionPlaceholder: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.regionPlaceholder', {
      defaultMessage: 'Select region',
    }),

  placeholderStepDescription: (stepTitle: string) =>
    i18n.translate('xpack.dataFederation.datasetWizard.placeholderStepDescription', {
      defaultMessage: '{stepTitle} will be implemented in a follow-up step.',
      values: { stepTitle },
    }),

  cancelButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.cancelButton', {
      defaultMessage: 'Cancel',
    }),

  backButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.backButton', {
      defaultMessage: 'Back',
    }),

  nextButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.nextButton', {
      defaultMessage: 'Next',
    }),

  addButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.addButton', {
      defaultMessage: 'Add dataset',
    }),

  saveButton: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.saveButton', {
      defaultMessage: 'Save dataset',
    }),

  nameRequired: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.nameRequired', {
      defaultMessage: 'Dataset name is required.',
    }),

  nameAlreadyExists: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.nameAlreadyExists', {
      defaultMessage: 'A dataset with this name already exists.',
    }),

  dataSourceRequired: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.dataSourceRequired', {
      defaultMessage: 'Data source is required.',
    }),

  resourceRequired: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.resourceRequired', {
      defaultMessage: 'Resource is required.',
    }),

  additionalSettingsTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.additionalSettingsTitle', {
      defaultMessage: 'Additional settings (optional)',
    }),

  additionalSettingsDescription: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.additionalSettingsDescription', {
      defaultMessage: 'You can further customize your setup of your dataset',
    }),

  formatAutoDetectedSuffix: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.formatAutoDetectedSuffix', {
      defaultMessage: '(auto-detected)',
    }),

  commonSettingsTitle: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.commonSettingsTitle', {
      defaultMessage: 'Common settings',
    }),

  delimiterOptionComma: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.delimiterOptionComma', {
      defaultMessage: 'Comma (,)',
    }),

  delimiterOptionTab: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.delimiterOptionTab', {
      defaultMessage: 'Tab',
    }),

  delimiterOptionSemicolon: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.delimiterOptionSemicolon', {
      defaultMessage: 'Semicolon (;)',
    }),

  delimiterOptionPipe: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.delimiterOptionPipe', {
      defaultMessage: 'Pipe (|)',
    }),

  accordionStructureAndSchema: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionStructureAndSchema', {
      defaultMessage: 'Structure and schema',
    }),

  accordionTextParsing: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionTextParsing', {
      defaultMessage: 'Text parsing',
    }),

  accordionColumnsAndValues: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionColumnsAndValues', {
      defaultMessage: 'Columns and values',
    }),

  accordionErrorHandling: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionErrorHandling', {
      defaultMessage: 'Error handling',
    }),

  accordionLimitsAndPerformance: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionLimitsAndPerformance', {
      defaultMessage: 'Limits and performance',
    }),

  accordionComingSoon: () =>
    i18n.translate('xpack.dataFederation.datasetWizard.accordionComingSoon', {
      defaultMessage: 'Coming soon',
    }),
};
