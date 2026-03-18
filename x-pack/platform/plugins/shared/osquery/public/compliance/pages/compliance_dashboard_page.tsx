/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiPageHeader,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiCallOut,
} from '@elastic/eui';
import { useBenchmarks, useDashboardStats } from '../hooks';
import { ComplianceScoreGauge } from '../components/compliance_score_gauge';
import { ComplianceBySectionTable } from '../components/compliance_by_section_table';
import { WorstHostsTable } from '../components/worst_hosts_table';

const TIME_RANGE_OPTIONS = [
  { value: '24h', inputDisplay: 'Last 24 hours' },
  { value: '7d', inputDisplay: 'Last 7 days' },
  { value: '30d', inputDisplay: 'Last 30 days' },
];

export const ComplianceDashboardPage: React.FC = () => {
  const { data: benchmarksData, isLoading: benchmarksLoading } = useBenchmarks();
  const benchmarks = useMemo(() => benchmarksData?.benchmarks ?? [], [benchmarksData?.benchmarks]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('24h');

  const activeBenchmark = selectedBenchmark || benchmarks[0]?.id || '';
  const { data: stats, isLoading: statsLoading } = useDashboardStats(activeBenchmark, timeRange);

  const benchmarkOptions = useMemo(
    () =>
      benchmarks.map((b: any) => ({
        value: b.id,
        inputDisplay: b.name,
        dropdownDisplay: (
          <span>
            {b.name} ({b.enabled_rules}/{b.total_rules} rules)
          </span>
        ),
      })),
    [benchmarks]
  );

  const rightSideItems = useMemo(
    () => [
      <EuiFlexGroup gutterSize="m" key="controls">
        <EuiFlexItem>
          <EuiSuperSelect
            options={benchmarkOptions}
            valueOfSelected={activeBenchmark}
            onChange={setSelectedBenchmark}
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSuperSelect
            options={TIME_RANGE_OPTIONS}
            valueOfSelected={timeRange}
            onChange={setTimeRange}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>,
    ],
    [benchmarkOptions, activeBenchmark, timeRange]
  );

  const sections = useMemo(() => stats?.sections ?? [], [stats?.sections]);
  const worstHosts = useMemo(() => stats?.worst_hosts ?? [], [stats?.worst_hosts]);

  if (benchmarksLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (benchmarks.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="checkInCircleFilled"
        title={<h2>No Compliance Benchmarks Configured</h2>}
        body={
          <p>
            Enable a compliance benchmark to start monitoring your endpoint posture. Navigate to the
            Rules tab to enable CIS benchmarks for macOS, Windows, or Linux.
          </p>
        }
      />
    );
  }

  return (
    <>
      <EuiPageHeader
        pageTitle="Endpoint Compliance"
        description="Monitor endpoint compliance posture against CIS benchmarks"
        rightSideItems={rightSideItems}
      />
      <EuiSpacer size="l" />

      {statsLoading ? (
        <EuiLoadingSpinner size="xl" />
      ) : !stats ? (
        <EuiCallOut title="No findings yet" color="primary" iconType="iInCircle">
          <p>
            Compliance checks have not produced findings yet. Deploy a benchmark to start collecting
            data.
          </p>
        </EuiCallOut>
      ) : (
        <>
          <ComplianceScoreGauge
            score={stats.score}
            passed={stats.passed_findings}
            failed={stats.failed_findings}
            total={stats.total_findings}
          />
          <EuiSpacer size="l" />
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <ComplianceBySectionTable sections={sections} />
            </EuiFlexItem>
            <EuiFlexItem>
              <WorstHostsTable hosts={worstHosts} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
