/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import type { TimeState, TimeRange } from '@kbn/es-query';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import React, { useState, useMemo } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';
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
  const { isServerless } = useKibana();

  // Create independent time state for general data chart
  const [timeRange, setTimeRange] = useState<TimeRange>(() => ({
    from: 'now-15m',
    to: 'now',
  }));

  const timeState: TimeState = useMemo(() => {
    const asAbsolute = getAbsoluteTimeRange(timeRange, { forceNow: new Date() });
    const start = new Date(asAbsolute.from);
    const end = new Date(asAbsolute.to);

    return {
      timeRange,
      start: start.getTime(),
      end: end.getTime(),
      asAbsoluteTimeRange: {
        ...asAbsolute,
        mode: 'absolute' as const,
      },
    };
  }, [timeRange]);

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
            <UncontrolledStreamsAppSearchBar
              showDatePicker
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
              onQuerySubmit={({ dateRange }) => {
                if (dateRange) {
                  setTimeRange(dateRange);
                }
              }}
            />
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
