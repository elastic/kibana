/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiProgress,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { ProcessorOutcomePreview } from './processor_outcome_preview';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { DetectedFieldsEditor } from './detected_fields_editor';
import { DataSourcesList } from './data_sources_list';
import { selectTypeValidationResult } from './state_management/stream_enrichment_state_machine/selectors';

export const SimulationPlayground = () => {
  const { refreshSimulation, viewSimulationPreviewData, viewSimulationDetectedFields } =
    useStreamEnrichmentEvents();

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

  const detectedFields = useSimulatorSelector((state) => state.context.detectedSchemaFields);

  const validationResult = useStreamEnrichmentSelector((state) =>
    selectTypeValidationResult(state.context)
  );

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTabs bottomBorder={false}>
              <EuiTab
                isSelected={isViewingDataPreview}
                onClick={viewSimulationPreviewData}
                append={
                  <EuiButtonIcon
                    iconType="refresh"
                    onClick={refreshSimulation}
                    aria-label={i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.refreshPreviewAriaLabel',
                      { defaultMessage: 'Refresh data preview' }
                    )}
                  />
                }
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.dataPreview',
                  { defaultMessage: 'Data preview' }
                )}
              </EuiTab>
              <EuiTab
                isSelected={isViewingDetectedFields}
                onClick={viewSimulationDetectedFields}
                append={
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    {detectedFields.length > 0 ? (
                      <EuiNotificationBadge size="m" color="subdued">
                        {detectedFields.length}
                      </EuiNotificationBadge>
                    ) : null}
                    {validationResult instanceof Error &&
                      validationResult.name === 'ConditionalTypeChangeError' && (
                        <EuiIcon type="error" color="danger" size="l" />
                      )}
                  </EuiFlexGroup>
                }
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFields',
                  { defaultMessage: 'Detected fields' }
                )}
              </EuiTab>
            </EuiTabs>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DataSourcesList />
          </EuiFlexItem>
          <ProgressBar />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {isViewingDataPreview && <ProcessorOutcomePreview />}
      {isViewingDetectedFields && (
        <DetectedFieldsEditor validationResult={validationResult} detectedFields={detectedFields} />
      )}
    </>
  );
};

const ProgressBar = () => {
  const isLoading = useSimulatorSelector(
    (state) => state.matches('debouncingChanges') || state.matches('runningSimulation')
  );

  return isLoading && <EuiProgress size="xs" color="accent" position="absolute" />;
};
