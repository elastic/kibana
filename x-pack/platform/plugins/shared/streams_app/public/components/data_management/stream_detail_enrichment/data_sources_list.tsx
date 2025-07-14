/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiCheckbox,
  EuiPanel,
  EuiText,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiButtonEmpty,
  useEuiTheme,
  EuiButtonIcon,
} from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';
import { css } from '@emotion/react';
import {
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import {
  DataSourceActorRef,
  useDataSourceSelector,
} from './state_management/data_source_state_machine';

const DataSourcesFlyout = dynamic(() =>
  import('./data_sources_flyout').then((mod) => ({ default: mod.DataSourcesFlyout }))
);

const VISIBLE_DATA_SOURCES_LIMIT = 2;
const DATA_SOURCE_CARD_MAX_WIDTH = 160;

const manageDataSourcesLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.openDataSourcesManagement.label',
  { defaultMessage: 'Manage data sources' }
);

export const DataSourcesList = () => {
  const { closeDataSourcesManagement, openDataSourcesManagement } = useStreamEnrichmentEvents();

  const isManagingDataSources = useStreamEnrichmentSelector((state) =>
    state.matches({ ready: { enrichment: { managingDataSources: 'open' } } })
  );
  const dataSourcesRefs = useStreamEnrichmentSelector((state) => state.context.dataSourcesRefs);

  const visibleDataSourcesRefs = dataSourcesRefs.slice(0, VISIBLE_DATA_SOURCES_LIMIT);
  const hiddenDataSourcesRefs = dataSourcesRefs.slice(VISIBLE_DATA_SOURCES_LIMIT);
  const hasHiddenDataSources = hiddenDataSourcesRefs.length > 0;

  return (
    <EuiFlexGroup wrap={false} alignItems="center" gutterSize="s">
      {visibleDataSourcesRefs.map((dataSourceRef) => (
        <EuiFlexItem key={dataSourceRef.id} grow={false}>
          <DataSourceListItem dataSourceRef={dataSourceRef} />
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiPanel paddingSize="xs" hasShadow={false} hasBorder>
          <EuiToolTip content={manageDataSourcesLabel}>
            {hasHiddenDataSources ? (
              <EuiButtonEmpty
                iconType="controls"
                iconSide="right"
                onClick={openDataSourcesManagement}
                aria-label={manageDataSourcesLabel}
                size="s"
              >
                <EuiNotificationBadge color="subdued" size="m">
                  +{hiddenDataSourcesRefs.length}
                </EuiNotificationBadge>
              </EuiButtonEmpty>
            ) : (
              <EuiButtonIcon
                iconType="controls"
                onClick={openDataSourcesManagement}
                aria-label={manageDataSourcesLabel}
                size="s"
              />
            )}
          </EuiToolTip>
        </EuiPanel>
      </EuiFlexItem>
      {isManagingDataSources && <DataSourcesFlyout onClose={closeDataSourcesManagement} />}
    </EuiFlexGroup>
  );
};

interface DataSourceListItemProps {
  readonly dataSourceRef: DataSourceActorRef;
}

const DataSourceListItem = ({ dataSourceRef }: DataSourceListItemProps) => {
  const { euiTheme } = useEuiTheme();
  const dataSourceState = useDataSourceSelector(dataSourceRef, (snapshot) => snapshot);

  const isEnabled = dataSourceState.matches('enabled');
  const toggleActivity = () => {
    dataSourceRef.send({ type: 'dataSource.toggleActivity' });
  };

  const content = (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      css={css`
        max-width: ${DATA_SOURCE_CARD_MAX_WIDTH}px;
      `}
    >
      <strong
        className="eui-textTruncate"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {dataSourceState.context.dataSource.name || dataSourceState.context.dataSource.type}
      </strong>
      <EuiText component="span" size="s" color="subdued">
        ({dataSourceState.context.data.length})
      </EuiText>
    </EuiFlexGroup>
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
