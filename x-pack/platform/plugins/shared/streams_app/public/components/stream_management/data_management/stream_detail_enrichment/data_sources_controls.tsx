/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiText,
  EuiToolTip,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiSuperSelect,
} from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';
import { css } from '@emotion/react';
import {
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { getActiveDataSourceRef } from './state_management/stream_enrichment_state_machine/utils';
import type { EnrichmentDataSourceWithUIAttributes } from './types';
import { DATA_SOURCES_I18N } from './data_sources_flyout/translations';
import {
  CompleteSimulationBadge,
  PartialSimulationBadge,
} from './data_sources_flyout/data_source_card';

const DataSourcesFlyout = dynamic(() =>
  import('./data_sources_flyout').then((mod) => ({ default: mod.DataSourcesFlyout }))
);

const manageDataSourcesLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.openDataSourcesManagement.label',
  { defaultMessage: 'Manage data sources' }
);

export const DataSourcesControls = () => {
  const { closeDataSourcesManagement, openDataSourcesManagement } = useStreamEnrichmentEvents();

  const isManagingDataSources = useStreamEnrichmentSelector((state) =>
    state.matches({ ready: { enrichment: { managingDataSources: 'open' } } })
  );

  return (
    <EuiFlexGroup
      wrap={false}
      alignItems="center"
      gutterSize="s"
      data-test-subj="streamsAppProcessingDataSourcesList"
    >
      <DataSourceSelector />
      <EuiPanel paddingSize="xs" hasShadow={false} hasBorder>
        <EuiToolTip content={manageDataSourcesLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj="streamsAppProcessingManageDataSourcesButton"
            iconType="controls"
            onClick={openDataSourcesManagement}
            aria-label={manageDataSourcesLabel}
            size="xs"
          />
        </EuiToolTip>
      </EuiPanel>
      {isManagingDataSources && <DataSourcesFlyout onClose={closeDataSourcesManagement} />}
    </EuiFlexGroup>
  );
};

const DataSourceSelector = () => {
  const { selectDataSource } = useStreamEnrichmentEvents();
  const dataSourcesRefs = useStreamEnrichmentSelector((state) => state.context.dataSourcesRefs);
  const selectedDataSourceRef = useStreamEnrichmentSelector((state) =>
    getActiveDataSourceRef(state.context.dataSourcesRefs)
  );

  const options = dataSourcesRefs.map((dataSourceRef) => {
    const snapshot = dataSourceRef.getSnapshot();

    const name = snapshot.context.dataSource.name || snapshot.context.dataSource.type;
    return {
      value: dataSourceRef.id,
      inputDisplay: (
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="xs">
          <span className="eui-textTruncate">{name}</span>
          <div
            css={{
              display: 'flex',
              lineHeight: 0,
            }}
          >
            {snapshot.context.simulationMode === 'partial' ? (
              <PartialSimulationBadge short />
            ) : (
              <CompleteSimulationBadge short />
            )}
          </div>
        </EuiFlexGroup>
      ),
      dropdownDisplay: (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="xs">
            <strong className="eui-textTruncate">{name}</strong>
            {snapshot.context.simulationMode === 'partial' ? (
              <PartialSimulationBadge short />
            ) : (
              <CompleteSimulationBadge short />
            )}
          </EuiFlexGroup>
          <EuiText component="p" size="xs" color="subdued">
            {getOptionSubtitle(snapshot.context.dataSource.type)}
          </EuiText>
        </EuiFlexGroup>
      ),
    };
  });

  return (
    <EuiSuperSelect
      aria-label={i18n.translate('xpack.streams.dataSource.dataSourceSelector.ariaLabel', {
        defaultMessage: 'Select a data source...',
      })}
      compressed
      css={css`
        width: 210px;
      `}
      data-test-subj="streamsAppProcessingDataSourceSelector"
      hasDividers
      options={options}
      valueOfSelected={selectedDataSourceRef?.id}
      onChange={(id) => selectDataSource(id)}
    />
  );
};

const getOptionSubtitle = (dataSourceType: EnrichmentDataSourceWithUIAttributes['type']) => {
  switch (dataSourceType) {
    case 'latest-samples':
      return DATA_SOURCES_I18N.latestSamples.subtitle;
    case 'kql-samples':
      return DATA_SOURCES_I18N.kqlDataSource.subtitle;
    case 'custom-samples':
      return DATA_SOURCES_I18N.customSamples.subtitle;
    case 'failure-store':
      return DATA_SOURCES_I18N.failureStore.subtitle;
  }
};
