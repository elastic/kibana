/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiNotificationBadge,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiToolTip,
} from '@elastic/eui';
import { ProcessorOutcomePreview } from './processor_outcome_preview';
import {
  useSimulatorSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { DetectedFieldsEditor } from './detected_fields_editor';
import type { SchemaEditorField } from '../schema_editor/types';
import { DataSourcesControls } from './data_sources_controls';
import { getActiveDataSourceRef } from './state_management/stream_enrichment_state_machine/utils';
import { useDataSourceSelector } from './state_management/data_source_state_machine';
import { selectWhetherThereAreOutdatedDocumentsInSimulation } from './state_management/stream_enrichment_state_machine/selectors';

export const SimulationPlayground = ({
  schemaEditorFields,
}: {
  schemaEditorFields: SchemaEditorField[];
}) => {
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

  const activeDataSourceRef = useStreamEnrichmentSelector((state) =>
    getActiveDataSourceRef(state.context.dataSourcesRefs)
  );

  const isDataSourceLoading = useDataSourceSelector(activeDataSourceRef, (state) =>
    state ? state.matches({ enabled: 'loadingData' }) : false
  );

  const dataSourceContext = useDataSourceSelector(activeDataSourceRef, (state) => state?.context);

  const hasOutdatedDocuments = useStreamEnrichmentSelector((state) =>
    selectWhetherThereAreOutdatedDocumentsInSimulation(state.context, dataSourceContext)
  );

  const detectedFields = useSimulatorSelector((state) => state.context.detectedSchemaFields);

  const [isRefreshTooltipVisible, setIsRefreshTooltipVisible] = useState(false);

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiTabs bottomBorder={false}>
              <EuiTab
                isSelected={isViewingDataPreview}
                append={
                  <>
                    {hasOutdatedDocuments && (
                      <EuiFlexItem data-test-subj="streamsAppProcessingOutdatedDocumentsTipAnchor">
                        <EuiIconTip
                          content={i18n.translate(
                            'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.outdatedDocumentsTooltip.content',
                            {
                              defaultMessage:
                                'Some documents are older than the most recent stream changes. Refresh to update simulation samples.',
                            }
                          )}
                          type="warning"
                          color="warning"
                        />
                      </EuiFlexItem>
                    )}
                  </>
                }
                onClick={viewSimulationPreviewData}
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
                  detectedFields.length > 0 ? (
                    <EuiNotificationBadge size="m" data-test-subj="streamsAppModifiedFieldsBadge">
                      {detectedFields.length}
                    </EuiNotificationBadge>
                  ) : undefined
                }
              >
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.detectedFields',
                  { defaultMessage: 'Modified fields' }
                )}
              </EuiTab>
            </EuiTabs>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DataSourcesControls />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPanel paddingSize="xs" hasShadow={false} hasBorder>
              <EuiToolTip
                content={
                  isRefreshTooltipVisible
                    ? i18n.translate(
                        'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.refreshPreviewTooltip',
                        {
                          defaultMessage: 'Refetch samples and rerun simulation',
                        }
                      )
                    : undefined
                }
                onMouseOut={() => setIsRefreshTooltipVisible(false)}
              >
                <EuiButtonIcon
                  iconType="refresh"
                  size="xs"
                  onClick={refreshSimulation}
                  isLoading={isDataSourceLoading}
                  onMouseEnter={() => setIsRefreshTooltipVisible(true)}
                  onMouseLeave={() => setIsRefreshTooltipVisible(false)}
                  aria-label={i18n.translate(
                    'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.refreshPreviewAriaLabel',
                    { defaultMessage: 'Refresh data preview' }
                  )}
                />
              </EuiToolTip>
            </EuiPanel>
          </EuiFlexItem>
          <ProgressBar />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {isViewingDataPreview && <ProcessorOutcomePreview />}
      {isViewingDetectedFields && <DetectedFieldsEditor schemaEditorFields={schemaEditorFields} />}
    </>
  );
};

const ProgressBar = () => {
  const isLoading = useSimulatorSelector(
    (state) => state.matches('debouncingChanges') || state.matches('runningSimulation')
  );

  return isLoading && <EuiProgress size="xs" color="accent" position="absolute" />;
};
