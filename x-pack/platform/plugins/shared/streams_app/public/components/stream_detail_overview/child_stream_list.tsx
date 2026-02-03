/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { css } from '@emotion/css';
import { type Streams, isDescendantOf } from '@kbn/streams-schema';

import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { AssetImage } from '../asset_image';
import { StreamsList, type StreamListItem } from '../streams_list';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';

export function ChildStreamList({ definition }: { definition?: Streams.ingest.all.GetResponse }) {
  const router = useStreamsAppRouter();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  // Fetch from internal API to get data_stream info for TSDB mode detection
  const { value: streamsResponse } = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      }),
    [streamsRepositoryClient]
  );

  const childrenStreams = useMemo((): StreamListItem[] | undefined => {
    if (!definition || !streamsResponse?.streams) {
      return undefined;
    }
    return streamsResponse.streams
      .filter((item) => isDescendantOf(definition.stream.name, item.stream.name))
      .map((item) => ({
        stream: item.stream,
        data_stream: item.data_stream,
      }));
  }, [definition, streamsResponse?.streams]);

  if (definition && childrenStreams?.length === 0) {
    return (
      <EuiFlexItem grow>
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem
            grow={false}
            className={css`
              max-width: 350px;
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              <AssetImage type="welcome" />
              <EuiText size="m" textAlign="center">
                {i18n.translate('xpack.streams.entityDetailOverview.noChildStreams', {
                  defaultMessage: 'Create streams for your logs',
                })}
              </EuiText>
              <EuiText size="xs" textAlign="center">
                {i18n.translate('xpack.streams.entityDetailOverview.noChildStreams', {
                  defaultMessage:
                    'Create sub streams to split out data with different retention policies, schemas, and more.',
                })}
              </EuiText>
              {definition.privileges.manage && (
                <EuiFlexGroup justifyContent="center">
                  <EuiButton
                    data-test-subj="streamsAppChildStreamListCreateChildStreamButton"
                    iconType="plusInCircle"
                    href={router.link('/{key}/management/{tab}', {
                      path: {
                        key: definition.stream.name,
                        tab: 'partitioning',
                      },
                    })}
                  >
                    {i18n.translate('xpack.streams.entityDetailOverview.createChildStream', {
                      defaultMessage: 'Create child stream',
                    })}
                  </EuiButton>
                </EuiFlexGroup>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }

  return <StreamsList streams={childrenStreams} showControls={false} />;
}
