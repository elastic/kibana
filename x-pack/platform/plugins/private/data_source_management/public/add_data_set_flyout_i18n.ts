/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const addDataSetFlyoutStrings = {
  title: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.title', {
      defaultMessage: 'Add data set',
    }),

  sourceLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.sourceLabel', {
      defaultMessage: 'Source',
    }),

  createNewConnectorOption: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.createNewConnectorOption', {
      defaultMessage: 'Create new connector',
    }),

  sourceSearchPlaceholder: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.sourceSearchPlaceholder', {
      defaultMessage: 'Filter sources…',
    }),

  sourceNoMatches: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.sourceNoMatches', {
      defaultMessage: 'No matching sources.',
    }),

  selectSourcePlaceholder: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.selectSourcePlaceholder', {
      defaultMessage: 'Select a source connector',
    }),

  sourceRequired: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.sourceRequired', {
      defaultMessage: 'Select a source.',
    }),

  noSourcesCallout: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.noSourcesCallout', {
      defaultMessage:
        'Use “Create new connector” in Source below, or connect a data source from the data sets page.',
    }),

  datasetIdLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.datasetIdLabel', {
      defaultMessage: 'Dataset ID',
    }),

  datasetIdHelp: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.datasetIdHelp', {
      defaultMessage: 'Unique name for this data set within the source (e.g. access_logs).',
    }),

  resourceLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.resourceLabel', {
      defaultMessage: 'Resource',
    }),

  resourceHelp: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.resourceHelp', {
      defaultMessage:
        'URI, glob pattern, table name, or SQL query that identifies the data (e.g. s3://logs-bucket/access/**/*.parquet).',
    }),

  descriptionLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.descriptionLabel', {
      defaultMessage: 'Description',
    }),

  descriptionHelp: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.descriptionHelp', {
      defaultMessage: 'Optional human-readable summary for people browsing catalog objects.',
    }),

  settingsPanelTitle: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.settingsPanelTitle', {
      defaultMessage: 'Advanced settings',
    }),

  partitionDetectionLabel: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.partitionDetectionLabel', {
      defaultMessage: 'Partition detection',
    }),

  partitionDetectionHelp: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.partitionDetectionHelp', {
      defaultMessage: 'How directory layout is interpreted when discovering partitions.',
    }),

  partitionOptionNone: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.partitionOptionNone', {
      defaultMessage: 'None',
    }),

  partitionOptionHive: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.partitionOptionHive', {
      defaultMessage: 'Hive',
    }),

  saveButton: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.saveButton', {
      defaultMessage: 'Add data set',
    }),

  datasetIdRequired: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.datasetIdRequired', {
      defaultMessage: 'Dataset ID is required.',
    }),

  resourceRequired: () =>
    i18n.translate('dataSourceManagement.addDataSetFlyout.resourceRequired', {
      defaultMessage: 'Resource is required.',
    }),
};
