/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexItem,
  EuiNotificationBadge,
  EuiProgress,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { isWiredStreamGetResponse } from '@kbn/streams-schema';
import { ProcessorOutcomePreview } from './processor_outcome_preview';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamsEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { DetectedFieldsEditor } from './detected_fields_editor';

export const SimulationPlayground = () => {
  const { viewSimulationPreviewData, viewSimulationDetectedFields } = useStreamEnrichmentEvents();

  const isViewingDataPreview = useStreamsEnrichmentSelector((state) =>
    state.matches({
      ready: { enrichment: { displayingSimulation: 'viewDataPreview' } },
    })
  );
  const isViewingDetectedFields = useStreamsEnrichmentSelector((state) =>
    state.matches({
      ready: { enrichment: { displayingSimulation: 'viewDetectedFields' } },
    })
  );

  const detectedFields = useSimulatorSelector((state) => state.context.detectedSchemaFields);
  const isLoading = useSimulatorSelector(
    (state) =>
      state.matches('debouncingChanges') ||
      state.matches('loadingSamples') ||
      state.matches('runningSimulation')
  );

  const definition = useStreamsEnrichmentSelector((state) => state.context.definition);
  const canViewDetectedFields = isWiredStreamGetResponse(definition);

  return (
    <>
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
        {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {isViewingDataPreview && <ProcessorOutcomePreview />}
      {isViewingDetectedFields && canViewDetectedFields && (
        <DetectedFieldsEditor definition={definition} detectedFields={detectedFields} />
      )}
    </>
  );
};
