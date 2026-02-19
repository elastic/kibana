/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingElastic,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
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

  if (totalEvents === 0 || totalEvents === undefined) {
    return (
      <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiPanel color="subdued">
            <EuiFlexGroup
              direction="column"
              alignItems="center"
              justifyContent="center"
              style={{ minHeight: '30vh', minWidth: '40vh' }}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type="createAdvancedJob" size="xxl" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h2>
                    {i18n.translate(
                      'xpack.streams.sigEventsDiscovery.insightsTab.noEventsFoundTitle',
                      {
                        defaultMessage: 'No events found to analyze',
                      }
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" textAlign="center" css={{ maxWidth: 400 }}>
                  {i18n.translate(
                    'xpack.streams.sigEventsDiscovery.insightsTab.noEventsFoundDescription',
                    {
                      defaultMessage:
                        'Newly created queries need time to collect data before analysis can begin.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <Summary count={totalEvents} />;
}
