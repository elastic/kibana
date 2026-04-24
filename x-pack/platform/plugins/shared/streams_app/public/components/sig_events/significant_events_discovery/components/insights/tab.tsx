/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiEmptyPrompt, EuiLoadingElastic } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';
import { useStreamsAppRouter } from '../../../../../hooks/use_streams_app_router';
import { AssetImage } from '../../../../asset_image';
import { Summary } from './summary';

export function InsightsTab() {
  const router = useStreamsAppRouter();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const queriesFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/_significant_events', {
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

  const totalEvents = queriesFetch.value?.aggregated_occurrences.reduce(
    (acc, current) => acc + current.count,
    0
  );

  if (totalEvents === 0) {
    return (
      <EuiEmptyPrompt
        aria-live="polite"
        titleSize="xs"
        icon={<AssetImage type="significantEventsDiscovery" />}
        title={
          <h2>
            {i18n.translate('xpack.streams.sigEventsDiscovery.insightsTab.noEventsFoundTitle', {
              defaultMessage: 'Significant Events',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.streams.sigEventsDiscovery.insightsTab.noEventsFoundDescription',
              {
                defaultMessage:
                  'To start discovering Significant Events, onboard your streams, extract Knowledge Indicators, and promote rules to begin detecting events.',
              }
            )}
          </p>
        }
        actions={
          <EuiButtonEmpty href={router.link('/_discovery/{tab}', { path: { tab: 'streams' } })}>
            {i18n.translate(
              'xpack.streams.sigEventsDiscovery.insightsTab.noEventsFoundGoToStreamsButton',
              { defaultMessage: 'Go to Streams tab' }
            )}
          </EuiButtonEmpty>
        }
      />
    );
  }

  return <Summary count={totalEvents ?? 0} />;
}
