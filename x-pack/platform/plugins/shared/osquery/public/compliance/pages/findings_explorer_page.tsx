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
  EuiFieldSearch,
  EuiSuperSelect,
  EuiBasicTable,
  EuiPanel,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiDescriptionList,
  EuiHealth,
  EuiBadge,
  EuiSpacer,
  EuiCallOut,
  EuiText,
  EuiEmptyPrompt,
} from '@elastic/eui';
import type { EuiBasicTableColumn, EuiSuperSelectOption, Criteria } from '@elastic/eui';
import { useComplianceFindings, useBenchmarks } from '../hooks';
import type { ComplianceFinding } from '../../../common/compliance';

type FindingRow = ComplianceFinding & { id: string };

const EVALUATION_COLORS: Record<string, string> = {
  passed: 'success',
  failed: 'danger',
  not_applicable: 'subdued',
};

const ALL_OPTION = '__all__';

const ResultBadge: React.FC<{ evaluation: string }> = React.memo(({ evaluation }) => (
  <EuiHealth color={EVALUATION_COLORS[evaluation] ?? 'subdued'}>
    {evaluation.replaceAll('_', ' ')}
  </EuiHealth>
));
ResultBadge.displayName = 'ResultBadge';

const LevelBadge: React.FC<{ level: number }> = React.memo(({ level }) => (
  <EuiBadge color={level === 1 ? 'primary' : 'warning'}>L{level}</EuiBadge>
));
LevelBadge.displayName = 'LevelBadge';

const EVALUATION_OPTIONS: Array<EuiSuperSelectOption<string>> = [
  { value: ALL_OPTION, inputDisplay: 'All results' },
  { value: 'passed', inputDisplay: 'Passed' },
  { value: 'failed', inputDisplay: 'Failed' },
  { value: 'not_applicable', inputDisplay: 'N/A' },
];

const FLAT_COLUMNS: Array<EuiBasicTableColumn<FindingRow>> = [
  {
    field: 'result.evaluation',
    name: 'Result',
    width: '100px',
    sortable: true,
    render: (_: unknown, item: FindingRow) => <ResultBadge evaluation={item.result.evaluation} />,
  },
  { field: 'rule.name', name: 'Rule', truncateText: true, sortable: true },
  { field: 'rule.section', name: 'Section', width: '120px' },
  {
    field: 'rule.level',
    name: 'Level',
    width: '60px',
    render: (_: unknown, item: FindingRow) => <LevelBadge level={item.rule.level} />,
  },
  { field: 'host.name', name: 'Host', truncateText: true },
  { field: 'host.os.name', name: 'OS' },
  {
    field: '@timestamp',
    name: 'Time',
    sortable: true,
    render: (ts: string) => new Date(ts).toLocaleString(),
    width: '180px',
  },
];

const BENCHMARK_SELECT_CSS = { minWidth: 200 };
const EVAL_SELECT_CSS = { minWidth: 150 };

export const FindingsExplorerPage: React.FC = () => {
  const { data: benchmarkData } = useBenchmarks();
  const [selectedBenchmark, setSelectedBenchmark] = useState(ALL_OPTION);
  const [evaluation, setEvaluation] = useState(ALL_OPTION);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [flyoutFinding, setFlyoutFinding] = useState<FindingRow | null>(null);

  const benchmarks = useMemo(() => benchmarkData?.benchmarks ?? [], [benchmarkData]);

  const benchmarkOptions = useMemo<Array<EuiSuperSelectOption<string>>>(() => {
    const opts: Array<EuiSuperSelectOption<string>> = [
      { value: ALL_OPTION, inputDisplay: 'All benchmarks' },
    ];
    for (const bm of benchmarks) {
      opts.push({ value: bm.id, inputDisplay: bm.name });
    }

    return opts;
  }, [benchmarks]);

  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = { page: page + 1, per_page: 25 };
    if (selectedBenchmark !== ALL_OPTION) params.benchmark_id = selectedBenchmark;
    if (evaluation !== ALL_OPTION) params.evaluation = evaluation;
    if (search) params.search = search;

    return params;
  }, [selectedBenchmark, evaluation, search, page]);

  const { data, isLoading, error } = useComplianceFindings(queryParams);

  const pagination = useMemo(
    () => ({
      pageIndex: page,
      pageSize: 25,
      totalItemCount: data?.total ?? 0,
      showPerPageOptions: false,
    }),
    [page, data?.total]
  );

  const handlePageChange = useCallback(
    (criteria: Criteria<FindingRow>) => setPage(criteria.page?.index ?? 0),
    []
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  }, []);

  const handleBenchmarkChange = useCallback((value: string) => {
    setSelectedBenchmark(value);
    setPage(0);
  }, []);

  const handleEvaluationChange = useCallback((value: string) => {
    setEvaluation(value);
    setPage(0);
  }, []);

  const closeFlyout = useCallback(() => setFlyoutFinding(null), []);

  const rowProps = useCallback(
    (item: FindingRow) => ({
      onClick: () => setFlyoutFinding(item),
      style: { cursor: 'pointer' as const },
    }),
    []
  );

  const flyoutDescriptionItems = useMemo(() => {
    if (!flyoutFinding) return [];

    return [
      { title: 'Result', description: flyoutFinding.result.evaluation },
      { title: 'Rule ID', description: flyoutFinding.rule.id },
      { title: 'Rule Name', description: flyoutFinding.rule.name },
      { title: 'Description', description: flyoutFinding.rule.description },
      { title: 'Section', description: flyoutFinding.rule.section },
      { title: 'Level', description: String(flyoutFinding.rule.level) },
      { title: 'Host', description: flyoutFinding.host.name },
      { title: 'Host ID', description: flyoutFinding.host.id },
      {
        title: 'OS',
        description: `${flyoutFinding.host.os.name} ${flyoutFinding.host.os.version}`,
      },
      {
        title: 'Benchmark',
        description: `${flyoutFinding.rule.benchmark.name} v${flyoutFinding.rule.benchmark.version}`,
      },
      { title: 'Remediation', description: flyoutFinding.rule.remediation },
      {
        title: 'Evidence',
        description: flyoutFinding.result.evidence
          ? JSON.stringify(flyoutFinding.result.evidence, null, 2)
          : 'None',
      },
    ];
  }, [flyoutFinding]);

  if (error) {
    return (
      <EuiCallOut title="Failed to load findings" color="danger" iconType="error">
        <p>{String(error)}</p>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiTitle size="l">
        <h1>Compliance Findings</h1>
      </EuiTitle>
      <EuiText color="subdued" size="s">
        <p>Explore individual compliance check results across managed endpoints</p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false} css={BENCHMARK_SELECT_CSS}>
          <EuiSuperSelect
            options={benchmarkOptions}
            valueOfSelected={selectedBenchmark}
            onChange={handleBenchmarkChange}
            compressed
            aria-label="Benchmark filter"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={EVAL_SELECT_CSS}>
          <EuiSuperSelect
            options={EVALUATION_OPTIONS}
            valueOfSelected={evaluation}
            onChange={handleEvaluationChange}
            compressed
            aria-label="Result filter"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldSearch
            value={search}
            onChange={handleSearchChange}
            placeholder="Search findings..."
            compressed
            aria-label="Search findings"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiPanel hasBorder>
        <EuiBasicTable<FindingRow>
          items={(data?.findings ?? []) as FindingRow[]}
          columns={FLAT_COLUMNS}
          loading={isLoading}
          pagination={pagination}
          onChange={handlePageChange}
          rowProps={rowProps}
          itemId="id"
        />
      </EuiPanel>

      {!isLoading && (data?.findings ?? []).length === 0 && (
        <EuiEmptyPrompt
          iconType="search"
          title={<h3>No findings</h3>}
          body={<p>Adjust your filters or wait for compliance checks to run.</p>}
        />
      )}

      {flyoutFinding && (
        <EuiFlyout onClose={closeFlyout} size="m" aria-labelledby="finding-flyout-title">
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <ResultBadge evaluation={flyoutFinding.result.evaluation} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="m">
                  <h2 id="finding-flyout-title">{flyoutFinding.rule.name}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiDescriptionList type="column" listItems={flyoutDescriptionItems} />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
