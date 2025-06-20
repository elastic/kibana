/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const DATA_SOURCES_I18N = {
  flyout: {
    title: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.title',
      { defaultMessage: 'Manage simulation data sources' }
    ),
    subtitle: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.subtitle',
      {
        defaultMessage:
          'Configure data sources for simulation and testing. Each data source provides sample data for your analysis.',
      }
    ),
    infoDescription: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.infoDescription',
      {
        defaultMessage:
          'Active data sources will be used for simulation. You can toggle data sources on/off without removing them.',
      }
    ),
    infoTitle: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.infoTitle',
      { defaultMessage: 'Data sources' }
    ),
  },
  contextMenu: {
    addDataSource: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.addDataSource.menu',
      { defaultMessage: 'Add data source' }
    ),
    addKqlDataSource: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.addDataSource.menu.addKqlDataSource',
      { defaultMessage: 'Add KQL search samples' }
    ),
    addCustomSamples: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.addDataSource.menu.addCustomSamples',
      { defaultMessage: 'Add custom docs samples' }
    ),
  },
  dataSourceCard: {
    enabled: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.enabled',
      { defaultMessage: 'Enabled' }
    ),
    disabled: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.disabled',
      { defaultMessage: 'Disabled' }
    ),
    deleteDataSourceLabel: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.deleteDataSourceLabel',
      { defaultMessage: 'Delete data source' }
    ),
    dataPreviewAccordionLabel: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.dataPreviewAccordion.label',
      { defaultMessage: 'Data preview' }
    ),
    noDataPreview: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.dataPreviewAccordion.noData',
      { defaultMessage: 'No documents to preview available' }
    ),
    delete: {
      title: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.delete.title',
        { defaultMessage: 'Remove sample data source?' }
      ),
      message: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.delete.message',
        { defaultMessage: 'Removed sample data source will need to be reconfigured.' }
      ),
      cancelButtonText: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.delete.cancelButtonText',
        { defaultMessage: 'Cancel' }
      ),
      confirmButtonText: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.delete.confirmButtonText',
        { defaultMessage: 'Delete' }
      ),
    },
  },
  randomSamples: {
    name: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSources.randomSamples.name',
      { defaultMessage: 'Random samples from stream' }
    ),
    subtitle: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSources.randomSamples.subtitle',
      { defaultMessage: 'Automatically samples random data from the stream.' }
    ),
    callout: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSources.randomSamples.callout',
      {
        defaultMessage:
          'The random samples data source cannot be deleted to guarantee available samples for the simulation. You can still disable it if you want to focus on samples from other data sources.',
      }
    ),
  },
  kqlDataSource: {
    defaultName: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.kqlDataSource.defaultName',
      { defaultMessage: 'KQL search samples' }
    ),
    subtitle: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.kqlDataSource.subtitle',
      { defaultMessage: 'Sample data using KQL query syntax.' }
    ),
  },
  customSamples: {
    defaultName: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.customSamples.defaultName',
      { defaultMessage: 'Custom samples' }
    ),
    subtitle: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.customSamples.subtitle',
      { defaultMessage: 'Manually defined sample documents.' }
    ),
    callout: i18n.translate('xpack.streams.enrichment.dataSources.customSamples.callout', {
      defaultMessage:
        'The custom samples will not be persisted. They will be lost when you leave the processing page.',
    }),
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.customSamples.label',
      { defaultMessage: 'Documents' }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.customSamples.helpText"
        defaultMessage="Use JSON format: {code}"
        values={{
          code: (
            <EuiCode>
              {JSON.stringify([
                { '@timestamp': '2025-06-17T12:00:00Z', message: 'Sample log message' },
              ])}
            </EuiCode>
          ),
        }}
      />
    ),
  },
  nameField: {
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.nameField.label',
      { defaultMessage: 'Name' }
    ),
    helpText: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.nameField.helpText',
      { defaultMessage: 'Describe what samples the data source loads.' }
    ),
  },
} as const;
