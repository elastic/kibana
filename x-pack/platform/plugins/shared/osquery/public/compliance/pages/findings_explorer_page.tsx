/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiPageHeader,
  EuiSpacer,
  EuiBasicTable,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiSuperSelect,
  EuiLoadingSpinner,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiDescriptionList,
  EuiCodeBlock,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { useComplianceFindings, useBenchmarks } from '../hooks';

const ResultBadge: React.FC<{ value: string }> = ({ value }) => {
  const colorMap: Record<string, string> = {
    passed: 'success',
    failed: 'danger',
    not_applicable: 'default',
  };

  return <EuiBadge color={colorMap[value] ?? 'default'}>{value}</EuiBadge>;
};

const DateCell: React.FC<{ value: string }> = ({ value }) => (
  <>{value ? new Date(value).toLocaleString() : '—'}</>
);

const BENCHMARK_ALL = '';
const EVAL_ALL = '';

const EVAL_OPTIONS = [
  { value: EVAL_ALL, inputDisplay: 'All results' },
  { value: 'passed', inputDisplay: 'Passed' },
  { value: 'failed', inputDisplay: 'Failed' },
  { value: 'not_applicable', inputDisplay: 'N/A' },
];

const COLUMNS: Array<EuiBasicTableColumn<any>> = [
  { field: 'rule.benchmark.rule_number', name: 'Rule #', width: '80px', sortable: true },
  { field: 'rule.name', name: 'Rule Name', truncateText: true },
  { field: 'host.name', name: 'Host', truncateText: true },
  {
    field: 'result.evaluation',
    name: 'Result',
    width: '120px',
    render: (val: string) => <ResultBadge value={val} />,
  },
  { field: 'rule.section', name: 'Section' },
  {
    field: '@timestamp',
    name: 'Evaluated',
    render: (val: string) => <DateCell value={val} />,
  },
];

export const FindingsExplorerPage: React.FC = () => {
  const [benchmarkId, setBenchmarkId] = useState<string>(BENCHMARK_ALL);
  const [evaluation, setEvaluation] = useState<string>(EVAL_ALL);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedFinding, setSelectedFinding] = useState<any>(null);

  const { data: benchmarksData } = useBenchmarks();
  const benchmarks = useMemo(() => benchmarksData?.benchmarks ?? [], [benchmarksData?.benchmarks]);

  const params = useMemo(() => {
    const p: Record<string, unknown> = { page, per_page: 25 };
    if (benchmarkId) p.benchmark_id = benchmarkId;
    if (evaluation) p.evaluation = evaluation;

    return p;
  }, [benchmarkId, evaluation, page]);

  const { data, isLoading } = useComplianceFindings(params);
  const findings = data?.findings ?? [];

  const benchmarkOptions = useMemo(
    () => [
      { value: BENCHMARK_ALL, inputDisplay: 'All benchmarks' },
      ...benchmarks.map((b: any) => ({ value: b.id, inputDisplay: b.name })),
    ],
    [benchmarks]
  );

  const pagination = useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize: 25,
      totalItemCount: data?.total ?? 0,
    }),
    [page, data?.total]
  );

  const handlePageChange = useCallback(({ page: p }: { page?: { index: number } }) => {
    if (p) setPage(p.index + 1);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
    []
  );

  const closeFlyout = useCallback(() => setSelectedFinding(null), []);

  const flyoutDescriptionItems = useMemo(() => {
    if (!selectedFinding) return [];
    const resultColor = selectedFinding.result?.evaluation === 'passed' ? 'success' : 'danger';

    return [
      {
        title: 'Result',
        description: <EuiBadge color={resultColor}>{selectedFinding.result?.evaluation}</EuiBadge>,
      },
      {
        title: 'Benchmark',
        description: `${selectedFinding.rule?.benchmark?.name} ${selectedFinding.rule?.benchmark?.version}`,
      },
      { title: 'Rule Number', description: selectedFinding.rule?.benchmark?.rule_number ?? '—' },
      { title: 'Section', description: selectedFinding.rule?.section ?? '—' },
      {
        title: 'Host',
        description: `${selectedFinding.host?.name} (${selectedFinding.host?.os?.name} ${selectedFinding.host?.os?.version})`,
      },
    ];
  }, [selectedFinding]);

  return (
    <>
      <EuiPageHeader
        pageTitle="Findings"
        description="Explore compliance check results across your fleet"
      />
      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={2}>
          <EuiFieldSearch
            placeholder="Search findings..."
            value={search}
            onChange={handleSearchChange}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSuperSelect
            options={benchmarkOptions}
            valueOfSelected={benchmarkId}
            onChange={setBenchmarkId}
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSuperSelect
            options={EVAL_OPTIONS}
            valueOfSelected={evaluation}
            onChange={setEvaluation}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {isLoading ? (
        <EuiLoadingSpinner size="xl" />
      ) : (
        <EuiBasicTable
          items={findings}
          columns={COLUMNS}
          pagination={pagination}
          onChange={handlePageChange}
        />
      )}

      {selectedFinding && (
        <EuiFlyout onClose={closeFlyout} size="m">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>{selectedFinding.rule?.name}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiDescriptionList listItems={flyoutDescriptionItems} />
            <EuiSpacer />
            <EuiTitle size="xs">
              <h4>Description</h4>
            </EuiTitle>
            <EuiText size="s">
              <p>{selectedFinding.rule?.description}</p>
            </EuiText>
            <EuiSpacer />
            <EuiTitle size="xs">
              <h4>Remediation</h4>
            </EuiTitle>
            <EuiText size="s">
              <p>{selectedFinding.rule?.remediation}</p>
            </EuiText>
            {selectedFinding.result?.evidence && (
              <>
                <EuiSpacer />
                <EuiTitle size="xs">
                  <h4>Evidence</h4>
                </EuiTitle>
                <EuiCodeBlock language="json" fontSize="s" paddingSize="m">
                  {JSON.stringify(selectedFinding.result.evidence, null, 2)}
                </EuiCodeBlock>
              </>
            )}
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
