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
          'Select a data source to be used for the processing simulation or create a new one.',
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
    deleteDataSourceDisabledLabel: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.dataSourceCard.deleteDataSourceDisabledLabel',
      {
        defaultMessage:
          'Cannot delete data source while it is selected. Switch to another data source first.',
      }
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
  latestSamples: {
    defaultName: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSources.latestSamples.name',
      { defaultMessage: 'Latest samples' }
    ),
    placeholderName: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSources.latestSamples.placeholderName',
      { defaultMessage: 'Latest samples' }
    ),
    subtitle: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSources.latestSamples.subtitle',
      { defaultMessage: 'Sample the last 100 documents.' }
    ),
    callout: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSources.latestSamples.callout',
      {
        defaultMessage:
          'The latest samples data source cannot be deleted to guarantee available samples for the simulation.',
      }
    ),
  },
  kqlDataSource: {
    defaultName: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.kqlDataSource.defaultName',
      { defaultMessage: 'KQL search samples' }
    ),
    placeholderName: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.kqlDataSource.placeholderName',
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
    placeholderName: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.customSamples.placeholderName',
      { defaultMessage: 'Custom samples' }
    ),
    subtitle: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.customSamples.subtitle',
      { defaultMessage: 'Manually defined sample documents.' }
    ),
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
  failureStore: {
    defaultName: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.failureStore.defaultName',
      { defaultMessage: 'Failure store' }
    ),
    placeholderName: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.failureStore.placeholderName',
      { defaultMessage: 'Failure store' }
    ),
    subtitle: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.failureStore.subtitle',
      { defaultMessage: 'Use documents from the failure store.' }
    ),
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.failureStore.label',
      { defaultMessage: 'Failed documents' }
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
