/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiPageHeader,
  EuiSpacer,
  EuiBasicTable,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
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
  type CriteriaWithPagination,
} from '@elastic/eui';
import { useComplianceRules, useBenchmarks, useBulkAction } from '../hooks';

const EMPTY_BENCHMARK = '';

export const RulesManagementPage: React.FC = () => {
  const [benchmarkId, setBenchmarkId] = useState<string>(EMPTY_BENCHMARK);
  const [page, setPage] = useState(1);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  const { data: benchmarksData } = useBenchmarks();

  const benchmarks = useMemo(() => benchmarksData?.benchmarks ?? [], [benchmarksData?.benchmarks]);

  const params = useMemo<Record<string, unknown>>(() => {
    const p: Record<string, unknown> = { page, per_page: 25 };
    if (benchmarkId) p.benchmark_id = benchmarkId;

    return p;
  }, [page, benchmarkId]);

  const { data, isLoading, refetch } = useComplianceRules(params);
  const rules = data?.rules ?? [];
  const bulkAction = useBulkAction();

  const handleBulkEnable = useCallback(async () => {
    if (selectedRuleIds.length === 0) return;
    await bulkAction('enable', selectedRuleIds);
    setSelectedRuleIds([]);
    refetch();
  }, [selectedRuleIds, bulkAction, refetch]);

  const handleBulkDisable = useCallback(async () => {
    if (selectedRuleIds.length === 0) return;
    await bulkAction('disable', selectedRuleIds);
    setSelectedRuleIds([]);
    refetch();
  }, [selectedRuleIds, bulkAction, refetch]);

  const handleBulkMute = useCallback(async () => {
    if (selectedRuleIds.length === 0) return;
    await bulkAction('mute', selectedRuleIds);
    setSelectedRuleIds([]);
    refetch();
  }, [selectedRuleIds, bulkAction, refetch]);

  const handleBulkUnmute = useCallback(async () => {
    if (selectedRuleIds.length === 0) return;
    await bulkAction('unmute', selectedRuleIds);
    setSelectedRuleIds([]);
    refetch();
  }, [selectedRuleIds, bulkAction, refetch]);

  const closeFlyout = useCallback(() => setSelectedRule(null), []);
  const handleSelectionChange = useCallback(
    (items: any[]) => setSelectedRuleIds(items.map((i) => i.id)),
    []
  );

  const columns = useMemo<Array<EuiBasicTableColumn<any>>>(
    () => [
      { field: 'rule_number', name: 'Rule #', width: '80px', sortable: true },
      {
        field: 'name',
        name: 'Name',
        truncateText: true,
      },
      { field: 'section', name: 'Section' },
      {
        field: 'level',
        name: 'Level',
        width: '70px',
      },
      {
        field: 'platform',
        name: 'Platform',
        width: '90px',
      },
      {
        field: 'enabled',
        name: 'Enabled',
        width: '80px',
      },
      {
        field: 'frameworks',
        name: 'NIST Controls',
      },
    ],
    []
  );

  const benchmarkOptions = useMemo(
    () => [
      { value: EMPTY_BENCHMARK, inputDisplay: 'All benchmarks' },
      ...benchmarks.map((b: any) => ({ value: b.id, inputDisplay: b.name })),
    ],
    [benchmarks]
  );

  const selection = useMemo(
    () => ({
      onSelectionChange: handleSelectionChange,
      selectable: () => true as const,
    }),
    [handleSelectionChange]
  );

  const pagination = useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize: 25,
      totalItemCount: data?.total ?? 0,
    }),
    [page, data?.total]
  );

  const handlePageChange = useCallback(({ page: p }: CriteriaWithPagination<any>) => {
    if (p) setPage(p.index + 1);
  }, []);

  const flyoutDescriptionItems = useMemo(() => {
    if (!selectedRule) return [];

    return [
      {
        title: 'Benchmark',
        description: `${selectedRule.benchmark?.name} ${selectedRule.benchmark?.version}`,
      },
      { title: 'Rule Number', description: selectedRule.rule_number },
      { title: 'Section', description: selectedRule.section },
      { title: 'Level', description: `Level ${selectedRule.level}` },
      { title: 'Platform', description: selectedRule.platform },
      { title: 'Resource Type', description: selectedRule.resource_type ?? '—' },
    ];
  }, [selectedRule]);

  return (
    <>
      <EuiPageHeader
        pageTitle="Compliance Rules"
        description="Manage CIS benchmark rules and framework mappings"
      />
      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSuperSelect
            options={benchmarkOptions}
            valueOfSelected={benchmarkId}
            onChange={setBenchmarkId}
            compressed
          />
        </EuiFlexItem>
        {selectedRuleIds.length > 0 && (
          <>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={handleBulkEnable}>
                Enable
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={handleBulkDisable}>
                Disable
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={handleBulkMute}>
                Mute
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={handleBulkUnmute}>
                Unmute
              </EuiButton>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {isLoading ? (
        <EuiLoadingSpinner size="xl" />
      ) : (
        <EuiBasicTable
          items={rules}
          itemId="id"
          columns={columns}
          isSelectable
          selection={selection}
          pagination={pagination}
          onChange={handlePageChange}
        />
      )}

      {selectedRule && (
        <EuiFlyout onClose={closeFlyout} size="m">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>{selectedRule.name}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiDescriptionList listItems={flyoutDescriptionItems} />
            <EuiSpacer />
            <EuiTitle size="xs">
              <h4>Description</h4>
            </EuiTitle>
            <EuiText size="s">
              <p>{selectedRule.description}</p>
            </EuiText>
            <EuiSpacer />
            <EuiTitle size="xs">
              <h4>Osquery SQL</h4>
            </EuiTitle>
            <EuiCodeBlock language="sql" fontSize="s" paddingSize="m" isCopyable>
              {selectedRule.query}
            </EuiCodeBlock>
            <EuiSpacer />
            <EuiTitle size="xs">
              <h4>Remediation</h4>
            </EuiTitle>
            <EuiText size="s">
              <p>{selectedRule.remediation}</p>
            </EuiText>
            {selectedRule.frameworks?.length > 0 && (
              <>
                <EuiSpacer />
                <EuiTitle size="xs">
                  <h4>Framework Mappings</h4>
                </EuiTitle>
                <EuiFlexGroup gutterSize="xs" wrap>
                  {selectedRule.frameworks.map((f: any) => (
                    <EuiFlexItem grow={false} key={f.control}>
                      <EuiBadge>
                        {f.id} {f.version}: {f.control}
                      </EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </>
            )}
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
