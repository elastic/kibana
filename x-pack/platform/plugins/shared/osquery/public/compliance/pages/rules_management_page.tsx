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
  EuiSwitch,
  EuiIcon,
  EuiSpacer,
  EuiButton,
  EuiCallOut,
  EuiText,
  EuiToolTip,
  EuiButtonEmpty,
} from '@elastic/eui';
import type {
  EuiBasicTableColumn,
  EuiSuperSelectOption,
  EuiTableSelectionType,
  Criteria,
} from '@elastic/eui';
import { useBenchmarks, useComplianceRules, useBulkAction } from '../hooks';
import type { ComplianceRuleMetadata } from '../../../common/compliance';

type RuleRow = ComplianceRuleMetadata & { id: string };

const PLATFORM_ICONS: Record<string, string> = {
  darwin: 'logoApple',
  windows: 'logoWindows',
  linux: 'logoLinux',
};

const ALL_BENCHMARKS_OPTION = '__all__';
const BENCHMARK_SELECT_CSS = { minWidth: 220 };

const PlatformCell: React.FC<{ platform: string }> = React.memo(({ platform }) => (
  <EuiToolTip content={platform}>
    <EuiIcon type={PLATFORM_ICONS[platform] ?? 'compute'} size="l" />
  </EuiToolTip>
));
PlatformCell.displayName = 'PlatformCell';

const LevelBadge: React.FC<{ level: number }> = React.memo(({ level }) => (
  <EuiBadge color={level === 1 ? 'primary' : 'warning'}>L{level}</EuiBadge>
));
LevelBadge.displayName = 'LevelBadge';

const EnabledCell: React.FC<{ enabled: boolean }> = React.memo(({ enabled }) => (
  <EuiHealth color={enabled ? 'success' : 'subdued'}>{enabled ? 'Enabled' : 'Disabled'}</EuiHealth>
));
EnabledCell.displayName = 'EnabledCell';

const PrebuiltBadge: React.FC<{ prebuilt: boolean }> = React.memo(({ prebuilt }) =>
  prebuilt ? <EuiBadge color="hollow">Prebuilt</EuiBadge> : <EuiBadge>Custom</EuiBadge>
);
PrebuiltBadge.displayName = 'PrebuiltBadge';

const FrameworksBadges: React.FC<{ frameworks: ComplianceRuleMetadata['frameworks'] }> = React.memo(
  ({ frameworks }) => (
    <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
      {(frameworks ?? []).slice(0, 3).map((fw) => (
        <EuiFlexItem grow={false} key={`${fw.id}-${fw.control}`}>
          <EuiBadge color="hollow">
            {fw.id} {fw.control}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      {(frameworks ?? []).length > 3 && (
        <EuiFlexItem grow={false}>
          <EuiBadge>+{frameworks!.length - 3}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  )
);
FrameworksBadges.displayName = 'FrameworksBadges';

const COLUMNS: Array<EuiBasicTableColumn<RuleRow>> = [
  { field: 'rule_number', name: '#', width: '60px', sortable: true },
  { field: 'name', name: 'Rule Name', truncateText: true, sortable: true },
  {
    field: 'platform',
    name: 'OS',
    width: '50px',
    render: (_: unknown, item: RuleRow) => <PlatformCell platform={item.platform} />,
  },
  {
    field: 'level',
    name: 'Level',
    width: '60px',
    render: (_: unknown, item: RuleRow) => <LevelBadge level={item.level} />,
  },
  { field: 'section', name: 'Section', truncateText: true, sortable: true },
  {
    field: 'frameworks',
    name: 'Frameworks',
    render: (_: unknown, item: RuleRow) => <FrameworksBadges frameworks={item.frameworks} />,
  },
  {
    field: 'enabled',
    name: 'Status',
    width: '100px',
    render: (_: unknown, item: RuleRow) => <EnabledCell enabled={item.enabled} />,
  },
  {
    field: 'prebuilt',
    name: 'Source',
    width: '90px',
    render: (_: unknown, item: RuleRow) => <PrebuiltBadge prebuilt={item.prebuilt} />,
  },
];

export const RulesManagementPage: React.FC = () => {
  const { data: benchmarkData, isLoading: benchmarksLoading } = useBenchmarks();
  const [selectedBenchmark, setSelectedBenchmark] = useState(ALL_BENCHMARKS_OPTION);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedRules, setSelectedRules] = useState<RuleRow[]>([]);
  const [flyoutRule, setFlyoutRule] = useState<RuleRow | null>(null);

  const benchmarks = useMemo(() => benchmarkData?.benchmarks ?? [], [benchmarkData]);

  const benchmarkOptions = useMemo<Array<EuiSuperSelectOption<string>>>(() => {
    const opts: Array<EuiSuperSelectOption<string>> = [
      { value: ALL_BENCHMARKS_OPTION, inputDisplay: 'All benchmarks' },
    ];
    for (const bm of benchmarks) {
      opts.push({ value: bm.id, inputDisplay: bm.name });
    }

    return opts;
  }, [benchmarks]);

  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = { page: page + 1, per_page: 25 };
    if (selectedBenchmark !== ALL_BENCHMARKS_OPTION) params.benchmark_id = selectedBenchmark;
    if (search) params.search = search;

    return params;
  }, [selectedBenchmark, search, page]);

  const { data, isLoading, error } = useComplianceRules(queryParams);
  const bulkAction = useBulkAction();

  const rules = useMemo(() => data?.rules ?? [], [data?.rules]);

  const pagination = useMemo(
    () => ({
      pageIndex: page,
      pageSize: 25,
      totalItemCount: data?.total ?? 0,
      showPerPageOptions: false,
    }),
    [page, data?.total]
  );

  const handlePageChange = useCallback((criteria: Criteria<RuleRow>) => {
    setPage(criteria.page?.index ?? 0);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
  }, []);

  const handleBenchmarkChange = useCallback((value: string) => {
    setSelectedBenchmark(value);
    setPage(0);
  }, []);

  const handleSelectionChange = useCallback(
    (selection: RuleRow[]) => setSelectedRules(selection),
    []
  );

  const handleBulk = useCallback(
    (action: string) => {
      if (selectedRules.length === 0) return;
      bulkAction.mutate({ action, ruleIds: selectedRules.map((r) => r.id) });
      setSelectedRules([]);
    },
    [selectedRules, bulkAction]
  );

  const handleBulkEnable = useCallback(() => handleBulk('enable'), [handleBulk]);
  const handleBulkDisable = useCallback(() => handleBulk('disable'), [handleBulk]);
  const handleBulkMute = useCallback(() => handleBulk('mute'), [handleBulk]);
  const handleBulkUnmute = useCallback(() => handleBulk('unmute'), [handleBulk]);

  const closeFlyout = useCallback(() => setFlyoutRule(null), []);

  const selection = useMemo<EuiTableSelectionType<RuleRow>>(
    () => ({ onSelectionChange: handleSelectionChange }),
    [handleSelectionChange]
  );

  const rowProps = useCallback(
    (item: RuleRow) => ({
      onClick: () => setFlyoutRule(item),
      style: { cursor: 'pointer' as const },
    }),
    []
  );

  const noOp = useCallback(() => {}, []);

  const flyoutDescriptionItems = useMemo(() => {
    if (!flyoutRule) return [];

    return [
      { title: 'Rule ID', description: flyoutRule.rule_id },
      {
        title: 'Benchmark',
        description: `${flyoutRule.benchmark.name} v${flyoutRule.benchmark.version}`,
      },
      { title: 'Section', description: flyoutRule.section },
      { title: 'Level', description: String(flyoutRule.level) },
      { title: 'Platform', description: flyoutRule.platform },
      { title: 'Interval', description: `${flyoutRule.interval}s` },
      { title: 'Query', description: flyoutRule.query },
      { title: 'Remediation', description: flyoutRule.remediation },
      {
        title: 'Frameworks',
        description:
          (flyoutRule.frameworks ?? [])
            .map((f) => `${f.id} ${f.version} ${f.control}`)
            .join(', ') || 'None',
      },
    ];
  }, [flyoutRule]);

  if (error) {
    return (
      <EuiCallOut title="Failed to load rules" color="danger" iconType="error">
        <p>{String(error)}</p>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiTitle size="l">
        <h1>Compliance Rules</h1>
      </EuiTitle>
      <EuiText color="subdued" size="s">
        <p>Manage endpoint compliance rules and benchmarks</p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false} css={BENCHMARK_SELECT_CSS}>
          <EuiSuperSelect
            options={benchmarkOptions}
            valueOfSelected={selectedBenchmark}
            onChange={handleBenchmarkChange}
            isLoading={benchmarksLoading}
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldSearch
            value={search}
            onChange={handleSearchChange}
            placeholder="Search rules..."
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {selectedRules.length > 0 && (
        <>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{selectedRules.length}</strong> rules selected
              </EuiText>
            </EuiFlexItem>
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
              <EuiButtonEmpty size="s" onClick={handleBulkMute}>
                Mute
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" onClick={handleBulkUnmute}>
                Unmute
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}

      <EuiPanel hasBorder>
        <EuiBasicTable<RuleRow>
          items={rules}
          columns={COLUMNS}
          loading={isLoading}
          pagination={pagination}
          onChange={handlePageChange}
          selection={selection}
          rowProps={rowProps}
          itemId="id"
        />
      </EuiPanel>

      {flyoutRule && (
        <EuiFlyout onClose={closeFlyout} size="m">
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type={PLATFORM_ICONS[flyoutRule.platform] ?? 'compute'} size="l" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="m">
                  <h2>{flyoutRule.name}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch label="Enabled" checked={flyoutRule.enabled} disabled onChange={noOp} />
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
