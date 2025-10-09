/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import type { TimeState } from '@kbn/es-query';
import type { FailureStoreStats } from '../hooks/use_failure_store_stats';
import { FailureStoreChartBarSeries } from '../common/chart_components';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';
import type { useAggregations } from '../hooks/use_ingestion_rate';

export function FailureStoreIngestionRate({
  definition,
  stats,
  isLoadingStats,
  timeState,
  isLoadingAggregations,
  aggregations,
  aggregationsError,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: FailureStoreStats;
  isLoadingStats: boolean;
  timeState: TimeState;
  isLoadingAggregations: boolean;
  aggregations?: ReturnType<typeof useAggregations>['aggregations'];
  aggregationsError: Error | undefined;
}) {
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" grow={false}>
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={3}>
            <EuiText>
              <h5>
                {i18n.translate('xpack.streams.failureStoreEnabled.ingestionRatePanel', {
                  defaultMessage: 'Failure ingestion rate over time',
                })}
              </h5>
            </EuiText>
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
        <FailureStoreChartBarSeries
          definition={definition}
          stats={stats}
          timeState={timeState}
          isLoadingStats={isLoadingStats}
          isLoadingAggregations={isLoadingAggregations}
          aggregationsError={aggregationsError}
          aggregations={aggregations}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
