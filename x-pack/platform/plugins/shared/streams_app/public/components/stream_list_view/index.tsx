/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsAppPageHeader } from '../streams_app_page_header';
import { StreamsAppPageHeaderTitle } from '../streams_app_page_header/streams_app_page_header_title';
import { StreamsAppPageBody } from '../streams_app_page_body';
import { StreamsTreeTable } from './tree_table';
import { StreamsEmptyPrompt } from './empty_prompt';

export function StreamListView() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });
      return streams;
    },
    [streamsRepositoryClient]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <StreamsAppPageHeader
          title={
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <StreamsAppPageHeaderTitle
                  title={i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
                    defaultMessage: 'Streams',
                  })}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={i18n.translate('xpack.streams.streamsListView.betaBadgeLabel', {
                    defaultMessage: 'Technical Preview',
                  })}
                  tooltipContent={i18n.translate(
                    'xpack.streams.streamsListView.betaBadgeDescription',
                    {
                      defaultMessage:
                        'This functionality is experimental and not supported. It may change or be removed at any time.',
                    }
                  )}
                  alignment="middle"
                  size="s"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
      <StreamsAppPageBody background>
        {!streamsListFetch.loading && !streamsListFetch.value?.length ? (
          <StreamsEmptyPrompt />
        ) : (
          <StreamsTreeTable loading={streamsListFetch.loading} streams={streamsListFetch.value} />
        )}
      </StreamsAppPageBody>
    </EuiFlexGroup>
  );
}
