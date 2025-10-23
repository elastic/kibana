/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPopover, EuiPopoverTitle, EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DataQualityColumn } from '../stream_list_view/data_quality_column';
import { RetentionColumn } from '../stream_list_view/retention_column';
import { DocumentsColumn } from '../stream_list_view/documents_column';
import { useStreamDocCountsFetch } from '../../hooks/use_streams_doc_counts_fetch';
import { useTimefilter } from '../../hooks/use_timefilter';
import type { EnrichedStream } from '../stream_list_view/utils';
import { css } from '@emotion/react';
import { DATA_QUALITY_COLUMN_HEADER, RETENTION_COLUMN_HEADER, DOCUMENTS_COLUMN_HEADER } from '../stream_list_view/translations';

interface StreamNodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  stream: EnrichedStream;
  button: React.ReactElement;
}

export const StreamNodePopover = ({ isOpen, onClose, stream, button }: StreamNodePopupProps) => {
  const {effective_lifecycle: lifecycle, data_stream: dataStream, stream: { name: streamName, description: streamDescription }} = stream;

  const numDataPoints = 25;
  const { getStreamDocCounts } = useStreamDocCountsFetch({
    groupTotalCountByTimestamp: true,
    numDataPoints,
    canReadFailureStore: false,
  });
  const { timeState } = useTimefilter();

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={onClose}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>
        {streamName}
      </EuiPopoverTitle>
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
          <EuiFlexItem >
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
                  `}>
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

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <strong>{DATA_QUALITY_COLUMN_HEADER}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DataQualityColumn
                histogramQueryFetch={getStreamDocCounts(streamName)}
                streamName={streamName}
              />
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
    </EuiPopover>
  );
};