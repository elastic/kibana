/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useStreamEnrichmentSelector } from '../state_management/stream_enrichment_state_machine';
import { DATA_SOURCES_I18N } from './translations';
import { AddDataSourcesContextMenu } from './add_data_sources_context_menu';
import { DataSource } from './data_source';
import { CompleteSimulationBadge, PartialSimulationBadge } from './data_source_card';

interface DataSourcesFlyoutProps {
  onClose: () => void;
}

export const DataSourcesFlyout = ({ onClose }: DataSourcesFlyoutProps) => {
  const dataSourcesActorRefs = useStreamEnrichmentSelector(
    (snapshot) => snapshot.context.dataSourcesRefs
  );

  const flyoutTitleId = useGeneratedHtmlId();

  return (
    <EuiFlyoutResizable onClose={onClose} size="m" aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{DATA_SOURCES_I18N.flyout.title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText component="p" color="subdued">
          {DATA_SOURCES_I18N.flyout.subtitle}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        banner={
          <EuiCallOut title={DATA_SOURCES_I18N.flyout.infoDescription} iconType="pin">
            <FormattedMessage
              id="xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.partialSimulationDisclaimer"
              tagName="p"
              defaultMessage="{partialSimulationBadge} means this data source can only simulate the part of the pipeline that includes the newly added processors, because the original, unprocessed data content is not guaranteed."
              values={{
                partialSimulationBadge: <PartialSimulationBadge />,
              }}
            />
            <FormattedMessage
              id="xpack.streams.streamDetailView.managementTab.enrichment.dataSourcesFlyout.completeSimulationDisclaimer"
              tagName="p"
              defaultMessage="{completeSimulationBadge} means this data source can simulate the whole pipeline, since the original data content is guaranteed."
              values={{
                completeSimulationBadge: <CompleteSimulationBadge />,
              }}
            />
          </EuiCallOut>
        }
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiTitle size="s">
            <h3>{DATA_SOURCES_I18N.flyout.infoTitle}</h3>
          </EuiTitle>
          <AddDataSourcesContextMenu />
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup component="ul" direction="column" gutterSize="m">
          {dataSourcesActorRefs.map((dataSourceRef) => (
            <EuiFlexItem key={dataSourceRef.id} component="li">
              <DataSource dataSourceRef={dataSourceRef} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};
