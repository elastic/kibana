/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { DataQualityColumn } from '../stream_list_view/data_quality_column';
import { RetentionColumn } from '../stream_list_view/retention_column';
import { DocumentsColumn } from '../stream_list_view/documents_column';
import { DiscoverBadgeButton } from '../stream_badges';
import { useStreamDocCountsFetch } from '../../hooks/use_streams_doc_counts_fetch';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useDataStreamStats } from '../data_management/stream_detail_lifecycle/hooks/use_data_stream_stats';
import { formatBytes } from '../data_management/stream_detail_lifecycle/helpers/format_bytes';
import type { EnrichedStream } from '../stream_list_view/utils';
import {
  DATA_QUALITY_COLUMN_HEADER,
  RETENTION_COLUMN_HEADER,
  DOCUMENTS_COLUMN_HEADER,
} from '../stream_list_view/translations';

interface StreamNodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  stream: EnrichedStream;
  button: React.ReactElement;
}

export const StreamNodePopover = ({ isOpen, onClose, stream, button }: StreamNodePopupProps) => {
  const {
    effective_lifecycle: lifecycle,
    data_stream: dataStream,
    stream: { name: streamName, description: streamDescription },
  } = stream;
  const router = useStreamsAppRouter();

  const numDataPoints = 25;
  const { getStreamDocCounts } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: true,
    numDataPoints,
    canReadFailureStore: false,
  });
  const { timeState } = useTimefilter();

  const { stats: storageStats, error: storageError } = useDataStreamStats({
    definition: {
      stream: stream.stream,
      data_stream_exists: !!dataStream,
    } as Streams.ingest.all.GetResponse,
    timeState,
  });

  return (
    <EuiPopover button={button} isOpen={isOpen} closePopover={onClose} anchorPosition="upCenter">
      <EuiPopoverTitle>{streamName}</EuiPopoverTitle>
      {streamDescription && (
        <>
          <EuiText size="s" color="subdued">
            {streamDescription}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFlexGroup direction="column" gutterSize="m">
        {dataStream && (
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <strong>{DOCUMENTS_COLUMN_HEADER}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div
                  css={css`
                    width: 180px;
                  `}
                >
                  <DocumentsColumn
                    indexPattern={streamName}
                    histogramQueryFetch={getStreamDocCounts(streamName)}
                    timeState={timeState}
                    numDataPoints={numDataPoints}
                  />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}

        {dataStream && storageStats && (
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <strong>
                    {i18n.translate('xpack.streams.streamDetailLifecycle.storageSize.title', {
                      defaultMessage: 'Storage size',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {storageError || !storageStats.ds?.stats?.sizeBytes
                    ? '-'
                    : formatBytes(storageStats.ds.stats.sizeBytes)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <strong>{DATA_QUALITY_COLUMN_HEADER}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DataQualityColumn streamName={streamName} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <strong>{RETENTION_COLUMN_HEADER}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RetentionColumn
                lifecycle={lifecycle!}
                dataTestSubj={`retentionColumn-${streamName}`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiPopoverFooter>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <strong>
                {i18n.translate('xpack.streams.streamPopup.actionsLabel', {
                  defaultMessage: 'Actions',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={true}>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.streams.streamPopup.viewStreamDetailsLabel', {
                    defaultMessage: 'View stream details',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj={`streamsNameLink-${streamName}`}
                  href={router.link('/{key}', { path: { key: streamName } })}
                >
                  {streamName}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={true}>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.streams.streamPopup.navigateToDiscoverLabel', {
                    defaultMessage: 'Navigate to Discover',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DiscoverBadgeButton
                  definition={
                    {
                      stream: stream.stream,
                      data_stream_exists: !!dataStream,
                    } as Streams.ingest.all.GetResponse
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
