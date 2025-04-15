/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiBetaBadge } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsTreeTable } from './tree_table';
import { StreamsEmptyPrompt } from './empty_prompt';
import { StreamsAppPageTemplate } from '../streams_app_page_template';

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
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="m">
            {i18n.translate('xpack.streams.streamsListView.pageHeaderTitle', {
              defaultMessage: 'Streams',
            })}
            <EuiBetaBadge
              label={i18n.translate('xpack.streams.streamsListView.betaBadgeLabel', {
                defaultMessage: 'Technical Preview',
              })}
              tooltipContent={i18n.translate('xpack.streams.streamsListView.betaBadgeDescription', {
                defaultMessage:
                  'This functionality is experimental and not supported. It may change or be removed at any time.',
              })}
              alignment="middle"
              size="s"
            />
          </EuiFlexGroup>
        }
      />
      <StreamsAppPageTemplate.Body grow>
        {!streamsListFetch.loading && !streamsListFetch.value?.length ? (
          <StreamsEmptyPrompt />
        ) : (
          <StreamsTreeTable loading={streamsListFetch.loading} streams={streamsListFetch.value} />
        )}
      </StreamsAppPageTemplate.Body>
    </>
  );
}
