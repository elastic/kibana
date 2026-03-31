/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingElastic } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';
import { AssetImage } from '../../../../asset_image';
import { Summary } from './summary';

export function InsightsTab() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const queriesFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/_queries', {
        params: {
          query: {
            from: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
            bucketSize: '30s',
          },
        },
        signal,
      }),
    [streamsRepositoryClient]
  );

  if (queriesFetch.loading) {
    return <EuiLoadingElastic />;
  }

  const totalEvents = queriesFetch.value?.total ?? 0;

  if (totalEvents === 0) {
    return (
      <EuiEmptyPrompt
        aria-live="polite"
        titleSize="xs"
        icon={<AssetImage type="significantEventsDiscovery" />}
        title={
          <h2>
            {i18n.translate('xpack.streams.sigEventsDiscovery.insightsTab.noEventsFoundTitle', {
              defaultMessage: 'No events found to analyze',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.streams.sigEventsDiscovery.insightsTab.noEventsFoundDescription',
              {
                defaultMessage:
                  'Discover Significant Events from your logs, and understand what they mean with the power of AI and Elastic Observability.',
              }
            )}
          </p>
        }
      />
    );
  }

  return <Summary count={totalEvents} />;
}
