/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';
import { ChartBarSeries, ChartBarPhasesSeries } from '../common/chart_components';

export function IngestionRate({
  definition,
  stats,
  isLoadingStats,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  isLoadingStats: boolean;
}) {
  const { timeState } = useTimefilter();
  const { isServerless } = useKibana();

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={3}>
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiText>
                <h5>
                  {i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRatePanel', {
                    defaultMessage: 'Ingestion over time',
                  })}
                </h5>
              </EuiText>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <StreamsAppSearchBar showDatePicker />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer />

      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={{ width: '100%', minHeight: '250px' }}
        direction="column"
        gutterSize="xs"
      >
        {isServerless ? (
          <ChartBarSeries
            definition={definition}
            stats={stats}
            timeState={timeState}
            isLoadingStats={isLoadingStats}
          />
        ) : (
          <ChartBarPhasesSeries
            definition={definition}
            stats={stats}
            timeState={timeState}
            isLoadingStats={isLoadingStats}
          />
        )}
      </EuiFlexGroup>
    </>
  );
}
