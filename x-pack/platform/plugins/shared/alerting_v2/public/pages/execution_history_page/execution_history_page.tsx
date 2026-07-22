/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiSpacer, EuiTabs, EuiTab, EuiTitle } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { DateRangePicker } from '@kbn/date-range-picker';
import type { DateRangePickerOnChangeProps, DateRangePickerSettings } from '@kbn/date-range-picker';
import { ExperimentalBadge } from '../../components/experimental_badge';
import { ActionPolicyDetailsFlyoutContainer } from '../../components/action_policy/details_flyout/action_policy_details_flyout_container';
import { RuleSummaryFlyoutContainer } from '../../components/rule/flyouts/rule_summary_flyout_container';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { PoliciesTabContent, RulesTabContent } from './components';
import { ExecutionKpis } from './components/execution_kpis';
import { TaskManagerHealth } from './components/task_manager_health';
import { TopFailing } from './components/top_failing';
import { PrototypeOptions, usePrototypeFlags } from './components/prototype_options';

const TIME_RANGE_PRESETS = [
  { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
  { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
  { start: 'now-7d', end: 'now', label: 'Last 7 days' },
  { start: 'now-30d', end: 'now', label: 'Last 30 days' },
];

const DEFAULT_DATE_PICKER_SETTINGS: DateRangePickerSettings = {
  roundRelativeTime: true,
  timePrecision: 's',
};

const POLICIES_TAB_ID = 'policies';
const RULES_TAB_ID = 'rules';

type TabId = typeof POLICIES_TAB_ID | typeof RULES_TAB_ID;

const EXECUTION_HISTORY_PAGE_TITLE = i18n.translate('xpack.alertingV2.executionHistory.pageTitle', {
  defaultMessage: 'Global execution',
});

const getExecutionHistoryTabs = ({
  selectedTabId,
  onSelect,
}: {
  selectedTabId: TabId;
  onSelect: (id: TabId) => void;
}): AppHeaderTab[] => [
  {
    id: RULES_TAB_ID,
    label: i18n.translate('xpack.alertingV2.executionHistory.tabs.rulesLabel', {
      defaultMessage: 'Rules',
    }),
    isSelected: selectedTabId === RULES_TAB_ID,
    onClick: () => onSelect(RULES_TAB_ID),
    'data-test-subj': 'executionHistoryRulesTab',
  },
  {
    id: POLICIES_TAB_ID,
    label: i18n.translate('xpack.alertingV2.executionHistory.tabs.policiesLabel', {
      defaultMessage: 'Policies',
    }),
    isSelected: selectedTabId === POLICIES_TAB_ID,
    onClick: () => onSelect(POLICIES_TAB_ID),
    'data-test-subj': 'executionHistoryPoliciesTab',
  },
];

export const ExecutionHistoryPage = () => {
  useBreadcrumbs('execution_history_list');

  const [selectedTabId, setSelectedTabId] = useState<TabId>(RULES_TAB_ID);
  const [policyToViewId, setPolicyToViewId] = useState<string | null>(null);
  const [ruleToViewId, setRuleToViewId] = useState<string | null>(null);
  const [datePickerSettings, setDatePickerSettings] = useState<DateRangePickerSettings>(
    DEFAULT_DATE_PICKER_SETTINGS
  );
  const { flyout: composeFlyout, openEditFlyout, openCloneFlyout } = useComposeDiscoverFlyout();
  const { flags, setFlags } = usePrototypeFlags();

  const handleDatePickerChange = useCallback((args: DateRangePickerOnChangeProps) => {
    if (args.isInvalid) return;
  }, []);

  const handlePolicyClick = (policyId: string) => {
    setRuleToViewId(null);
    setPolicyToViewId(policyId);
  };

  const handleRuleClick = (ruleId: string) => {
    setPolicyToViewId(null);
    setRuleToViewId(ruleId);
  };

  const tabs = useMemo(
    () => getExecutionHistoryTabs({ selectedTabId, onSelect: setSelectedTabId }),
    [selectedTabId]
  );

  return (
    <>
      <AppHeader
        sticky={false}
        title={EXECUTION_HISTORY_PAGE_TITLE}
        titleAppend={<ExperimentalBadge />}
        padding={{ bleed: 'm' }}
      />
      <EuiSpacer size="m" />
      <TaskManagerHealth />
      <EuiSpacer size="m" />
      <DateRangePicker
        defaultValue="Last 24 hours"
        presets={TIME_RANGE_PRESETS}
        settings={datePickerSettings}
        onChange={handleDatePickerChange}
        onSettingsChange={setDatePickerSettings}
      />
      <EuiSpacer size="m" />
      <ExecutionKpis showCharts={flags.showCharts} />
      <EuiSpacer size="m" />
      <TopFailing onRuleClick={handleRuleClick} onPolicyClick={handlePolicyClick} />
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.alertingV2.executionHistory.executionLogsTitle', {
            defaultMessage: 'Execution logs',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiTabs>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={tab.isSelected}
            onClick={tab.onClick}
            data-test-subj={tab['data-test-subj']}
          >
            {tab.label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {selectedTabId === RULES_TAB_ID ? (
        <RulesTabContent onRuleClick={handleRuleClick} />
      ) : (
        <PoliciesTabContent
          onPolicyClick={handlePolicyClick}
          onRuleClick={handleRuleClick}
          activeRuleId={ruleToViewId}
        />
      )}
      {policyToViewId && (
        <ActionPolicyDetailsFlyoutContainer
          policyId={policyToViewId}
          onClose={() => setPolicyToViewId(null)}
        />
      )}
      {ruleToViewId && (
        <RuleSummaryFlyoutContainer
          ruleId={ruleToViewId}
          onClose={() => setRuleToViewId(null)}
          onEdit={(r) => {
            setRuleToViewId(null);
            openEditFlyout(r);
          }}
          onClone={(r) => {
            setRuleToViewId(null);
            openCloneFlyout(r);
          }}
        />
      )}
      {composeFlyout}
      <PrototypeOptions flags={flags} onChange={setFlags} />
    </>
  );
};
