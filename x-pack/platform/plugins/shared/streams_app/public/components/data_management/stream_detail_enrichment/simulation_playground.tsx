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
  EuiCheckbox,
  EuiPanel,
  EuiText,
  EuiSkeletonText,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
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
import { DataSourcesFlyout } from './data_sources_flyout';
import {
  DataSourceActorRef,
  useDataSourceSelector,
} from './state_management/data_source_state_machine';

export const SimulationPlayground = () => {
  const { viewSimulationPreviewData, viewSimulationDetectedFields } = useStreamEnrichmentEvents();

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

  const detectedFields = useSimulatorSelector((state) => state.context.detectedSchemaFields);
  const isLoading = useSimulatorSelector(
    (state) => state.matches('debouncingChanges') || state.matches('runningSimulation')
  );

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTabs bottomBorder={false}>
              <EuiTab isSelected={isViewingDataPreview} onClick={viewSimulationPreviewData}>
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
                    <EuiNotificationBadge size="m">{detectedFields.length}</EuiNotificationBadge>
                  ) : undefined
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
          {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="m" />
      {isViewingDataPreview && <ProcessorOutcomePreview />}
      {isViewingDetectedFields && (
        <DetectedFieldsEditor definition={definition} detectedFields={detectedFields} />
      )}
    </>
  );
};

const DataSourcesList = () => {
  const { closeDataSourcesManagement, manageDataSources } = useStreamEnrichmentEvents();

  const isManagingDataSources = useStreamEnrichmentSelector((state) =>
    state.matches({ ready: { enrichment: 'managingDataSources' } })
  );
  const dataSourcesRefs = useStreamEnrichmentSelector((state) => state.context.dataSourcesRefs);

  return (
    <EuiFlexGroup wrap={false} alignItems="center" gutterSize="s">
      {dataSourcesRefs.map((dataSourceRef) => (
        <EuiFlexItem key={dataSourceRef.id} grow={false}>
          <DataSourceListItem dataSourceRef={dataSourceRef} />
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
          <EuiToolTip content={manageDataSourcesLabel}>
            <EuiButtonIcon
              size="m"
              iconSize="l"
              iconType="advancedSettingsApp"
              aria-label={manageDataSourcesLabel}
              onClick={manageDataSources}
            />
          </EuiToolTip>
        </EuiPanel>
      </EuiFlexItem>
      {isManagingDataSources && <DataSourcesFlyout onClose={closeDataSourcesManagement} />}
    </EuiFlexGroup>
  );
};

const manageDataSourcesLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.manageDataSources.label',
  { defaultMessage: 'Manage data sources' }
);

const DataSourceListItem = ({ dataSourceRef }: { dataSourceRef: DataSourceActorRef }) => {
  const dataSourceState = useDataSourceSelector(dataSourceRef, (snapshot) => snapshot);

  const isEnabled = dataSourceState.matches('enabled');
  const isLoading = dataSourceState.matches({ enabled: 'loadingData' });
  const toggleActivity = () => {
    dataSourceRef.send({ type: 'dataSource.toggleActivity' });
  };

  const content = (
    <div>
      <strong>
        {dataSourceState.context.dataSource.name || dataSourceState.context.dataSource.type}
      </strong>
      <EuiSkeletonText
        size="xs"
        lines={1}
        isLoading={isLoading}
        contentAriaLabel={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.dataSources.loadingSamplesCount',
          { defaultMessage: 'Loading samples count' }
        )}
      >
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.simulationPlayground.dataSources.samplesCount',
            {
              defaultMessage: '{count, plural, one {# sample} other {# samples}}',
              values: { count: dataSourceState.context.data.length },
            }
          )}
        </EuiText>
      </EuiSkeletonText>
    </div>
  );

  return (
    <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
      <EuiCheckbox
        id={dataSourceRef.id}
        label={content}
        checked={isEnabled}
        onChange={toggleActivity}
      />
    </EuiPanel>
  );
};
