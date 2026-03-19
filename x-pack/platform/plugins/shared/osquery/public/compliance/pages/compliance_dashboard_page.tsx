/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiCallOut,
  EuiSuperSelect,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { useBenchmarks, useDashboardStats } from '../hooks';
import { ComplianceScoreGauge } from '../components/compliance_score_gauge';
import { ComplianceBySectionTable } from '../components/compliance_by_section_table';
import { WorstHostsTable } from '../components/worst_hosts_table';
import { ComplianceTrendChart } from '../components/compliance_trend_chart';
import { BenchmarkCard } from '../components/benchmark_card';
import type { ComplianceBenchmarkInfo } from '../../../common/compliance';

const TIME_RANGE_OPTIONS: Array<EuiSuperSelectOption<string>> = [
  { value: '24h', inputDisplay: 'Last 24 hours' },
  { value: '7d', inputDisplay: 'Last 7 days' },
  { value: '30d', inputDisplay: 'Last 30 days' },
];

const EMPTY_TREND: Array<{ timestamp: string; score: number }> = [];

const BENCHMARK_CARD_CSS = { minWidth: 220 };

const BenchmarkCardItem: React.FC<{
  benchmark: ComplianceBenchmarkInfo;
  score?: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}> = React.memo(({ benchmark, score, isSelected, onSelect }) => {
  const handleClick = useCallback(() => onSelect(benchmark.id), [onSelect, benchmark.id]);

  return (
    <EuiFlexItem grow={false} css={BENCHMARK_CARD_CSS}>
      <BenchmarkCard
        benchmark={benchmark}
        score={score}
        isSelected={isSelected}
        onClick={handleClick}
      />
    </EuiFlexItem>
  );
});
BenchmarkCardItem.displayName = 'BenchmarkCardItem';

export const ComplianceDashboardPage: React.FC = () => {
  const {
    data: benchmarkData,
    isLoading: benchmarksLoading,
    error: benchmarksError,
  } = useBenchmarks();
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>('');
  const [timeRange, setTimeRange] = useState('24h');

  const benchmarks = useMemo(() => benchmarkData?.benchmarks ?? [], [benchmarkData]);

  const activeBenchmarkId = selectedBenchmark || benchmarks[0]?.id || '';

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useDashboardStats(activeBenchmarkId, timeRange);

  const handleBenchmarkSelect = useCallback((id: string) => setSelectedBenchmark(id), []);
  const handleTimeRangeChange = useCallback((value: string) => setTimeRange(value), []);

  if (benchmarksLoading) {
    return (
      <EuiPanel>
        <EuiLoadingSpinner size="xl" role="status" aria-label="Loading" />
      </EuiPanel>
    );
  }

  if (benchmarksError) {
    return (
      <EuiCallOut title="Failed to load benchmarks" color="danger" iconType="error">
        <p>{String(benchmarksError)}</p>
      </EuiCallOut>
    );
  }

  if (benchmarks.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="checkInCircleFilled"
        title={<h2>No compliance benchmarks</h2>}
        body={<p>Enable the compliance feature flag and install prebuilt rules to get started.</p>}
      />
    );
  }

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="l">
            <h1>Endpoint Compliance</h1>
          </EuiTitle>
          <EuiText color="subdued" size="s">
            <p>CIS benchmark compliance posture for managed endpoints</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperSelect
            options={TIME_RANGE_OPTIONS}
            valueOfSelected={timeRange}
            onChange={handleTimeRangeChange}
            compressed
            aria-label="Time range"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="m">
        {benchmarks.map((bm) => (
          <BenchmarkCardItem
            key={bm.id}
            benchmark={bm}
            score={bm.id === activeBenchmarkId ? stats?.score : undefined}
            isSelected={bm.id === activeBenchmarkId}
            onSelect={handleBenchmarkSelect}
          />
        ))}
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {statsError && (
        <EuiCallOut title="Failed to load statistics" color="warning" iconType="warning">
          <p>{String(statsError)}</p>
        </EuiCallOut>
      )}

      {statsLoading ? (
        <EuiPanel>
          <EuiLoadingSpinner size="xl" role="status" aria-label="Loading" />
        </EuiPanel>
      ) : stats ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow={1}>
              <ComplianceScoreGauge
                score={stats.score}
                passed={stats.passed_findings}
                failed={stats.failed_findings}
                notApplicable={stats.not_applicable_findings}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <ComplianceTrendChart trend={stats.trend ?? EMPTY_TREND} />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <ComplianceBySectionTable sections={stats.sections} />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <WorstHostsTable hosts={stats.worst_hosts} />
        </>
      ) : null}
    </>
  );
};
