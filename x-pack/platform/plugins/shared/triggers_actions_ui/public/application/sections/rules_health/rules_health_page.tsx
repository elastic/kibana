/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { rulesAppDetailsRoute } from '@kbn/rule-data-utils';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import type { OnTimeChangeProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb, getRulesBreadcrumbWithHref } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';
import { RulesPageHeader } from '../rules_page/rules_page_header';
import { getClassicTabs } from '../rules_page/get_classic_tabs';
import { getRulesPageMenu } from '../rules_page/get_rules_page_menu';
import { useRulesPageActions } from '../rules_page/rules_page_actions';
import { RULES_PAGE_MODE, useRulesPageMode } from '../rules_page/use_rules_page_mode';
import { useLocators } from '../../locator_context';
import { useLoadRuleHealthQuery } from '../../hooks/use_load_rule_health_query';
import { useLoadGlobalExecutionTrendsQuery } from '../../hooks/use_load_global_execution_trends_query';
import { RuleHealthOverview } from './components/rule_health_overview';
import { RuleHealthTrends } from './components/rule_health_trends';
import type { RuleHealthSelection } from './lib/rule_health_filters';
import { buildRuleHealthKueryNode } from './lib/rule_health_filters';
import {
  CLEAR_SELECTION_LABEL,
  HEALTH_PAGE_TITLE,
  RULES_NEEDING_ATTENTION_TITLE,
  TRENDS_TITLE,
} from './translations';

const RulesList = lazy(() => import('../rules_list/components/rules_list'));

const HEALTH_RULES_LIST_KEY = 'rules-health';
const HEALTH_VISIBLE_COLUMNS = [
  'ruleName',
  'ruleTags',
  'ruleExecutionStatusLastDate',
  'ruleScheduleInterval',
  'ruleExecutionStatus',
  'ruleExecutionState',
];
const DEFAULT_SELECTION: RuleHealthSelection = { type: 'problems' };
const DEFAULT_DATE_START = 'now-24h';
const DEFAULT_DATE_END = 'now';

interface QuickRange {
  from: string;
  to: string;
  display: string;
}

export const RulesHealthContainer = () => {
  const history = useHistory();
  const {
    application: {
      getUrlForApp,
      capabilities: { rulesSettings = {} },
    },
    chrome: { docTitle },
    http,
    notifications: { toasts },
    docLinks,
    setBreadcrumbs,
    showClassicBadge,
    uiSettings,
  } = useKibana().services;
  const { rules } = useLocators();
  const { authorizedToReadAnyRules, authorizedToCreateAnyRules } = useGetRuleTypesPermissions({
    http,
    toasts,
    filteredRuleTypes: [],
  });
  const {
    openCreateRuleModal,
    navigateToSettings,
    navigateToCreateRuleForm,
    navigateToCreateRuleFromTemplateForm,
    navigateToEditRuleForm,
  } = useRulesPageActions();

  const { show, readFlappingSettingsUI, readQueryDelaySettingsUI } = rulesSettings;
  const canShowSettings = Boolean(show && (readFlappingSettingsUI || readQueryDelaySettingsUI));

  const docLink = docLinks.links.alerting.guide;
  const rulesListHref = rules.useUrl({});
  const alertsBackHref = getUrlForApp('observability-overview', { path: '/alerts' });
  const mode = useRulesPageMode();

  const [selection, setSelection] = useState<RuleHealthSelection>(DEFAULT_SELECTION);
  const [refresh, setRefresh] = useState<Date>();
  const [dateStart, setDateStart] = useState(DEFAULT_DATE_START);
  const [dateEnd, setDateEnd] = useState(DEFAULT_DATE_END);
  const [dateFormat] = useState(() => uiSettings?.get<string>('dateFormat'));
  const [commonlyUsedRanges] = useState(
    () =>
      uiSettings
        ?.get<QuickRange[]>('timepicker:quickRanges')
        ?.map(({ from, to, display }) => ({ start: from, end: to, label: display })) ?? []
  );

  const { health, isLoading } = useLoadRuleHealthQuery({
    enabled: authorizedToReadAnyRules,
    refresh,
  });

  const { trends, isLoading: isLoadingTrends } = useLoadGlobalExecutionTrendsQuery({
    enabled: authorizedToReadAnyRules,
    dateStart,
    dateEnd,
    refresh,
  });

  const kueryNodeFilter = useMemo(() => buildRuleHealthKueryNode(selection), [selection]);

  const onRulesRefresh = useCallback((date: Date) => setRefresh(date), []);

  const onTimeChange = useCallback(({ start, end, isInvalid }: OnTimeChangeProps) => {
    if (isInvalid) {
      return;
    }
    setDateStart(start);
    setDateEnd(end);
  }, []);

  const onTimeRefresh = useCallback(() => setRefresh(new Date()), []);

  useEffect(() => {
    setBreadcrumbs?.([getRulesBreadcrumbWithHref(), getAlertingSectionBreadcrumb('health')]);
    docTitle.change(getCurrentDocTitle('health'));
  }, [docTitle, setBreadcrumbs]);

  const menu = useMemo(
    () =>
      getRulesPageMenu({
        authorizedToCreateAnyRules,
        canShowSettings,
        onCreateRule: openCreateRuleModal,
        onOpenSettings: navigateToSettings,
      }),
    [authorizedToCreateAnyRules, canShowSettings, openCreateRuleModal, navigateToSettings]
  );

  const classicTabs = useMemo(
    () => getClassicTabs('health', authorizedToReadAnyRules, history),
    [authorizedToReadAnyRules, history]
  );

  const heading =
    mode !== RULES_PAGE_MODE.triggersActionsTabs ? (
      <AppHeader
        title={HEALTH_PAGE_TITLE}
        badges={
          showClassicBadge
            ? [
                {
                  label: i18n.translate(
                    'xpack.triggersActionsUI.sections.rulesHealth.classicRulesOnlyBadgeLabel',
                    { defaultMessage: 'Classic' }
                  ),
                  color: 'hollow',
                  'data-test-subj': 'classicRulesOnlyBadge',
                },
              ]
            : undefined
        }
        spacing="bleed"
        back={{
          href: rulesListHref,
          label: i18n.translate(
            'xpack.triggersActionsUI.sections.rulesHealth.backToRulesButtonLabel',
            { defaultMessage: 'Rules' }
          ),
        }}
        docLink={docLink}
        menu={menu}
      />
    ) : (
      <RulesPageHeader
        back={{
          href: alertsBackHref,
          label: i18n.translate('xpack.triggersActionsUI.rulesPage.backButtonLabel', {
            defaultMessage: 'Alerts',
          }),
        }}
        tabs={classicTabs}
        menu={menu}
        docLink={docLink}
      />
    );

  return (
    <>
      {heading}
      <KibanaPageTemplate.Section grow={false} paddingSize="none">
        <EuiSpacer size="m" />
        <RuleHealthOverview
          health={health}
          isLoading={isLoading}
          selection={selection}
          onSelectionChange={setSelection}
        />
        <EuiSpacer size="l" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>{TRENDS_TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSuperDatePicker
              data-test-subj="ruleHealthTrendsDatePicker"
              width="auto"
              isLoading={isLoadingTrends}
              start={dateStart}
              end={dateEnd}
              onTimeChange={onTimeChange}
              onRefresh={onTimeRefresh}
              dateFormat={dateFormat}
              commonlyUsedRanges={commonlyUsedRanges}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <RuleHealthTrends trends={trends} isLoading={isLoadingTrends} />
        <EuiSpacer size="l" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>{RULES_NEEDING_ATTENTION_TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {selection.type !== 'problems' && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="cross"
                onClick={() => setSelection(DEFAULT_SELECTION)}
                data-test-subj="ruleHealthClearSelection"
              >
                {CLEAR_SELECTION_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {suspendedComponentWithProps(
          RulesList,
          'xl'
        )({
          rulesListKey: HEALTH_RULES_LIST_KEY,
          visibleColumns: HEALTH_VISIBLE_COLUMNS,
          kueryNodeFilter,
          showActionFilter: false,
          showCreateRuleButtonInPrompt: false,
          ruleDetailsRoute: rulesAppDetailsRoute,
          navigateToEditRuleForm,
          navigateToCreateRuleForm,
          navigateToCreateRuleFromTemplateForm,
          onRefresh: onRulesRefresh,
        })}
      </KibanaPageTemplate.Section>
    </>
  );
};
