/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiHealth, EuiLink, EuiPanel, EuiText } from '@elastic/eui';
import type { UnmanagedElasticsearchAssetDetails } from '@kbn/streams-plugin/server/lib/streams/stream_crud';
import { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { LocatorPublic } from '@kbn/share-plugin/public';
import { css } from '@emotion/css';
import { HealthStatus } from '@elastic/elasticsearch/lib/api/types';
import { ManagedBadge } from './managed_badge';

interface DataStreamDetailsProps {
  dataStream: UnmanagedElasticsearchAssetDetails['dataStream'] | undefined;
  onFlyoutOpen: (name: string) => void;
  indexManagementLocator?: LocatorPublic<IndexManagementLocatorParams>;
}

const healthToColor = (health: HealthStatus) => {
  switch (health.toLowerCase()) {
    case 'green':
      return 'success';
    case 'yellow':
      return 'warning';
    case 'red':
      return 'danger';
  }
};

function DataStreamHealth({ health }: { health?: HealthStatus }) {
  if (!health) {
    return '-';
  }
  return <EuiHealth color={healthToColor(health)}>{health}</EuiHealth>;
}

export function DataStreamDetails({
  dataStream,
  onFlyoutOpen,
  indexManagementLocator,
}: DataStreamDetailsProps) {
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      className={css`
        min-width: 500px;
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiText>
          {i18n.translate('xpack.streams.streamDetailView.dataStream', {
            defaultMessage: 'Data stream',
          })}
        </EuiText>
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiText size="s">
              {i18n.translate('xpack.streams.streamDetailView.dataStreamName', {
                defaultMessage: 'Name',
              })}
            </EuiText>
            <EuiLink onClick={() => onFlyoutOpen(dataStream?.name || '')}>
              {dataStream ? dataStream.name : '-'}
              <ManagedBadge meta={dataStream?._meta} />
            </EuiLink>
          </EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiText size="s">
              {i18n.translate('xpack.streams.streamDetailView.health', {
                defaultMessage: 'Health',
              })}
            </EuiText>
            <EuiText size="s">
              <DataStreamHealth health={dataStream?.status} />
            </EuiText>
          </EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiText size="s">
              {i18n.translate('xpack.streams.streamDetailView.numberOfIndices', {
                defaultMessage: 'Indices',
              })}
            </EuiText>
            <EuiLink
              href={
                (dataStream &&
                  indexManagementLocator?.getRedirectUrl({
                    page: 'data_stream_index_list',
                    dataStreamName: dataStream.name,
                  })) ||
                ''
              }
            >
              {dataStream?.indices?.length || '-'}
            </EuiLink>
          </EuiFlexGroup>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiText size="s">
              {i18n.translate('xpack.streams.streamDetailView.indexMode', {
                defaultMessage: 'Index mode',
              })}
            </EuiText>
            <EuiText size="s">
              {/* index_mode is a new property and not part of the typing yet */}
              {(dataStream as { index_mode?: string } | undefined)?.index_mode || '-'}
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
