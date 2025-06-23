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
import { StreamsList } from '../streams_list';
import { useWiredStreams } from '../../hooks/use_wired_streams';

export function ChildStreamList({ definition }: { definition?: Streams.ingest.all.GetResponse }) {
  const router = useStreamsAppRouter();

  const { wiredStreams } = useWiredStreams();

  const childrenStreams = useMemo(() => {
    if (!definition) {
      return [];
    }
    return wiredStreams?.filter((d) => isDescendantOf(definition.stream.name, d.name));
  }, [definition, wiredStreams]);

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
                        tab: 'route',
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
