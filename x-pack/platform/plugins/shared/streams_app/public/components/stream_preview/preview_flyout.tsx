/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { StreamsGraph } from '../streams_graph';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useTimefilter } from '../../hooks/use_timefilter';

interface StreamPreviewFlyoutProps {
  stream: string;
  onClose: () => void;
}

export const StreamPreviewFlyout = ({ stream, onClose }: StreamPreviewFlyoutProps) => {
  const context = useKibana();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = context;

  const { timeState } = useTimefilter();
  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamsRepositoryClient, timeState.start, timeState.end]
  );

  return (
    <EuiFlyout ownFocus onClose={onClose} size="l">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <span>
            {i18n.translate('xpack.streams.streamPreviewFlyout.title', {
              defaultMessage: 'Stream architecture viewer',
            })}
          </span>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <StreamsGraph
          streams={streamsListFetch.value?.streams}
          loading={streamsListFetch.loading}
          showTitle={false}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              {i18n.translate('xpack.streams.streamPreviewFlyout.closeButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
