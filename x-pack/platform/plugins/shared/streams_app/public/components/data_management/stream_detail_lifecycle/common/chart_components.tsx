/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Axis, BarSeries, Chart, ScaleType, Settings } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { TimeState } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, PhaseName, Streams } from '@kbn/streams-schema';
import { capitalize } from 'lodash';
import moment from 'moment';
import React, { useMemo } from 'react';
import { orderIlmPhases } from '../helpers/helpers';
import { formatBytes } from '../helpers/format_bytes';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';
import { useIlmPhasesColorAndDescription } from '../hooks/use_ilm_phases_color_and_description';
import { useIngestionRate, useIngestionRatePerTier } from '../hooks/use_ingestion_rate';

interface ChartComponentProps {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  timeState: TimeState;
  isLoadingStats: boolean;
}

export function ChartBarSeries({
  definition,
  stats,
  timeState,
  isLoadingStats,
}: ChartComponentProps) {
  const {
    ingestionRate,
    isLoading: isLoadingIngestionRate,
    error: ingestionRateError,
  } = useIngestionRate({ definition, stats, timeState });
  const chartBaseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  return ingestionRateError ? (
    'Failed to load ingestion rate'
  ) : isLoadingStats || isLoadingIngestionRate || !ingestionRate ? (
    <EuiLoadingChart />
  ) : (
    <>
      <Chart size={{ height: 250 }}>
        <Settings showLegend={false} baseTheme={chartBaseTheme} />

        <BarSeries
          id="ingestionRate"
          name="Ingestion rate"
          data={ingestionRate.buckets}
          color={euiTheme.colors.severity.success}
          // Defaults to multi layer time axis as of Elastic Charts v70
          xScaleType={ScaleType.Time}
          xAccessor={'key'}
          yAccessors={['value']}
        />

        <Axis
          id="bottom-axis"
          position="bottom"
          tickFormat={(value) => moment(value).format('YYYY-MM-DD HH:mm:ss')}
          gridLine={{ visible: true }}
        />
        <Axis
          id="left-axis"
          position="left"
          tickFormat={(value) => formatBytes(value)}
          gridLine={{ visible: true }}
        />
      </Chart>
    </>
  );
}

export function ChartBarPhasesSeries({
  definition,
  stats,
  timeState,
  isLoadingStats,
}: ChartComponentProps) {
  const {
    ingestionRate,
    isLoading: isLoadingIngestionRate,
    error: ingestionRateError,
  } = useIngestionRatePerTier({ definition, stats, timeState });
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const chartBaseTheme = useElasticChartsTheme();

  const availablePhases = useMemo(() => {
    if (!ingestionRate) return {};
    const phaseKeys = Object.keys(ingestionRate.buckets) as (keyof typeof ilmPhases)[];
    return phaseKeys.reduce((acc, phase) => {
      acc[phase] = { name: phase } as any;
      return acc;
    }, {} as IlmPolicyPhases);
  }, [ingestionRate]);

  return ingestionRateError ? (
    'Failed to load ingestion rate'
  ) : isLoadingStats || isLoadingIngestionRate || !ingestionRate ? (
    <EuiLoadingChart />
  ) : (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" css={{ width: '100%' }} gutterSize="s">
        <EuiFlexItem grow={9}>
          <Chart size={{ height: 250 }}>
            <Settings showLegend={false} baseTheme={chartBaseTheme} />
            {Object.entries(ingestionRate.buckets).map(([tier, buckets]) => (
              <BarSeries
                id={`ingestionRate-${tier}`}
                key={`ingestionRate-${tier}`}
                name={capitalize(tier)}
                data={buckets}
                color={ilmPhases[tier as PhaseName].color}
                // Defaults to multi layer time axis as of Elastic Charts v70
                xScaleType={ScaleType.Time}
                xAccessor={'key'}
                yAccessors={['value']}
                stackAccessors={[0]}
              />
            ))}

            <Axis
              id="bottom-axis"
              position="bottom"
              tickFormat={(value) => moment(value).format('YYYY-MM-DD HH:mm:ss')}
              gridLine={{ visible: true }}
            />
            <Axis id="left-axis" position="left" tickFormat={(value) => formatBytes(value)} />
          </Chart>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <PhasesLegend phases={availablePhases} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function PhasesLegend({ phases }: { phases?: IlmPolicyPhases }) {
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const availablePhases = useMemo(() => {
    if (!phases) return [];

    const desc = orderIlmPhases(phases)
      .filter(({ name }) => name !== 'delete')
      .map((phase) => ({
        name: phase.name,
        color: ilmPhases[phase.name].color,
      })) as Array<
      {
        name: PhaseName | 'indefinite';
      } & ({ color: string } | { icon: string })
    >;

    return desc;
  }, [phases, ilmPhases]);

  if (!phases) return null;

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
      <EuiText>
        <h5>
          {i18n.translate('xpack.streams.streamDetailLifecycle.dataTiers', {
            defaultMessage: 'Data Tiers',
          })}
        </h5>
      </EuiText>
      <EuiSpacer size="s" />
      {availablePhases.map((phase) => (
        <React.Fragment key={phase.name}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false} css={{ width: '20px', alignItems: 'center' }}>
              {'color' in phase ? (
                <span
                  style={{
                    height: '12px',
                    width: '12px',
                    borderRadius: '50%',
                    backgroundColor: phase.color,
                    display: 'inline-block',
                  }}
                />
              ) : (
                <EuiIcon type={phase.icon} />
              )}
            </EuiFlexItem>

            <EuiFlexItem grow={2}>{capitalize(phase.name)}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
    </EuiPanel>
  );
}
