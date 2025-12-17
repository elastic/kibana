/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import type { TimeState } from '@kbn/es-query';
import { useKibana } from '../../../../hooks/use_kibana';
import { ChartBarSeries, ChartBarPhasesSeries } from '../common/chart_components';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';
import type { StreamAggregations } from '../hooks/use_ingestion_rate';
import type { CalculatedStats } from '../helpers/get_calculated_stats';

export function IngestionRate({
  definition,
  stats,
  isLoadingStats,
  timeState,
  aggregations,
  statsError,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: CalculatedStats;
  isLoadingStats: boolean;
  timeState: TimeState;
  aggregations?: StreamAggregations;
  statsError: Error | undefined;
}) {
  const { isServerless } = useKibana();

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={3}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText>
                  <h5>
                    {i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRatePanel', {
                      defaultMessage: 'Ingestion over time',
                    })}
                  </h5>
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                {isLoadingStats && aggregations && <EuiLoadingSpinner size="s" />}
              </EuiFlexItem>
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
            statsError={statsError}
            aggregations={aggregations}
          />
        ) : (
          <ChartBarPhasesSeries
            definition={definition}
            stats={stats}
            timeState={timeState}
            isLoadingStats={isLoadingStats}
            statsError={statsError}
          />
        )}
      </EuiFlexGroup>
    </>
  );
}
