/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiLink, EuiPanel, EuiText } from '@elastic/eui';
import type { UnmanagedElasticsearchAssetDetails } from '@kbn/streams-plugin/server/lib/streams/stream_crud';
import { css } from '@emotion/css';
import { ManagedBadge } from './managed_badge';

interface IngestPipelineDetailsProps {
  ingestPipeline: UnmanagedElasticsearchAssetDetails['ingestPipeline'] | undefined;
  onFlyoutOpen: (name: string) => void;
}

export function IngestPipelineDetails({
  ingestPipeline,
  onFlyoutOpen,
}: IngestPipelineDetailsProps) {
  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      className={css`
        min-width: 300px;
      `}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiText>
          {i18n.translate('xpack.streams.streamDetailView.ingestPipeline', {
            defaultMessage: 'Ingest pipeline',
          })}
        </EuiText>
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiText size="s">
              {i18n.translate('xpack.streams.streamDetailView.ingestPipelineName', {
                defaultMessage: 'Name',
              })}
            </EuiText>
            {ingestPipeline ? (
              <EuiLink onClick={() => onFlyoutOpen(ingestPipeline.name)}>
                {ingestPipeline.name}
                <ManagedBadge meta={ingestPipeline?._meta} />
              </EuiLink>
            ) : (
              <EuiText size="s">-</EuiText>
            )}
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
