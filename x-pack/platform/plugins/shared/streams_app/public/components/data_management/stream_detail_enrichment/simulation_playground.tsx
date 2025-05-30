/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiProgress,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { Streams } from '@kbn/streams-schema';
import { ProcessorOutcomePreview } from './processor_outcome_preview';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { DetectedFieldsEditor } from './detected_fields_editor';
import { DataSourcesFlyout } from './data_sources_flyout';

export const SimulationPlayground = () => {
  const {
    closeDataSourcesManagement,
    manageDataSources,
    viewSimulationPreviewData,
    viewSimulationDetectedFields,
  } = useStreamEnrichmentEvents();

  const definition = useStreamEnrichmentSelector((state) => state.context.definition);

  const isViewingDataPreview = useStreamEnrichmentSelector((state) =>
    state.matches({
      ready: { enrichment: { displayingSimulation: 'viewDataPreview' } },
    })
  );
  const isViewingDetectedFields = useStreamEnrichmentSelector((state) =>
    state.matches({
      ready: { enrichment: { displayingSimulation: 'viewDetectedFields' } },
    })
  );
  const isManagingDataSources = useStreamEnrichmentSelector((state) =>
    state.matches({ ready: { enrichment: 'managingDataSources' } })
  );

  const detectedFields = useSimulatorSelector((state) => state.context.detectedSchemaFields);
  const isLoading = useSimulatorSelector(
    (state) =>
      state.matches('debouncingChanges') ||
      state.matches('loadingSamples') ||
      state.matches('runningSimulation')
  );

  const canViewDetectedFields = Streams.WiredStream.GetResponse.is(definition);

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTabs bottomBorder={false}>
              <EuiTab isSelected={isViewingDataPreview} onClick={viewSimulationPreviewData}>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.dataPreview',
                  { defaultMessage: 'Data preview' }
                )}
              </EuiTab>
              {canViewDetectedFields && (
                <EuiTab
                  isSelected={isViewingDetectedFields}
                  onClick={viewSimulationDetectedFields}
                  append={
                    detectedFields.length > 0 ? (
                      <EuiNotificationBadge size="m">{detectedFields.length}</EuiNotificationBadge>
                    ) : undefined
                  }
                >
                  {i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFields',
                    { defaultMessage: 'Detected fields' }
                  )}
                </EuiTab>
              )}
            </EuiTabs>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="advancedSettingsApp"
              iconSide="right"
              onClick={manageDataSources}
            >
              {i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.manageDataSources.label',
                { defaultMessage: 'Manage data sources' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {isManagingDataSources && <DataSourcesFlyout onClose={closeDataSourcesManagement} />}
          {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {isViewingDataPreview && <ProcessorOutcomePreview />}
      {isViewingDetectedFields && canViewDetectedFields && (
        <DetectedFieldsEditor definition={definition} detectedFields={detectedFields} />
      )}
    </>
  );
};
