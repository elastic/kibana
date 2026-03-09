/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { BoolQuery } from '@kbn/es-query';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiTabbedContent, useEuiTheme } from '@elastic/eui';
import type { AlertStatusValues } from '@kbn/alerting-plugin/common';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { defaultAlertsTableColumns } from '@kbn/response-ops-alerts-table/configuration';
import type { AlertsTable as AlertsTableType } from '@kbn/response-ops-alerts-table';
import type { CasesService } from '@kbn/response-ops-alerts-table/types';
import { useKibana } from '../../../../common/lib/kibana';
import type { Rule, RuleSummary, AlertStatus, RuleType } from '../../../../types';
import type { ComponentOpts as RuleApis } from '../../common/components/with_bulk_rule_api_operations';
import { withBulkRuleOperations } from '../../common/components/with_bulk_rule_api_operations';

import type { RuleEventLogListProps } from './rule_event_log_list';
import type { AlertListItem, RefreshToken } from './types';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { suspendedComponentWithProps } from '../../../lib/suspended_component_with_props';
import type { AlertSummaryTimeRange } from '../../alert_summary_widget/types';
import {
  getRuleHealthColor,
  getRuleStatusMessage,
} from '../../../../common/lib/rule_status_helpers';
import RuleStatusPanelWithApi from './rule_status_panel';
import {
  ALERT_STATUS_LICENSE_ERROR,
  rulesLastRunOutcomeTranslationMapping,
  rulesStatusesTranslationsMapping,
} from '../../rules_list/translations';
import { RuleAlertActionsCell } from './rule_alert_actions_cell';
import { RuleAlertSearchBar } from './rule_alert_search_bar';
import { AlertSummaryWidget } from '../../alert_summary_widget';

const RuleEventLogList = lazy(() => import('./rule_event_log_list'));
const RuleDefinition = lazy(() => import('./rule_definition'));
const AlertsTable = lazy(() => import('@kbn/response-ops-alerts-table')) as AlertsTableType;

export type RuleComponentProps = {
  rule: Rule;
  ruleType: RuleType;
  readOnly: boolean;
  ruleSummary: RuleSummary;
  requestRefresh: () => Promise<void>;
  refreshToken?: RefreshToken;
  numberOfExecutions: number;
  onChangeDuration: (length: number) => void;
  durationEpoch?: number;
  isLoadingChart?: boolean;
} & Pick<RuleApis, 'muteAlertInstance' | 'unmuteAlertInstance'>;

const EVENT_LOG_LIST_TAB = 'rule_event_log_list';
const ALERT_LIST_TAB = 'rule_alert_list';

// We don't want to show the Feature column in the rule page
const alertsTableColumns = [defaultAlertsTableColumns[0], ...defaultAlertsTableColumns.slice(2)];

export function RuleComponent({
  rule,
  ruleType,
  readOnly,
  ruleSummary,
  requestRefresh,
  refreshToken,
  numberOfExecutions,
  onChangeDuration,
  durationEpoch = Date.now(),
  isLoadingChart,
}: RuleComponentProps) {
  const {
    ruleTypeRegistry,
    actionTypeRegistry,
    getCasesPlugin,
    data,
    http,
    notifications,
    fieldFormats,
    application,
    licensing,
    settings,
    charts,
    uiSettings,
  } = useKibana().services;

  const [cases, setCases] = useState<CasesService>();

  useEffect(() => {
    getCasesPlugin?.()
      .then(setCases)
      .catch(() => {});
  }, [getCasesPlugin]);

  const getAlertFormatter = useCallback(
    (ruleTypeId: string) => {
      if (!ruleTypeRegistry.has(ruleTypeId)) {
        return undefined;
      }
      return ruleTypeRegistry.get(ruleTypeId).format;
    },
    [ruleTypeRegistry]
  );
  // The lastReloadRequestTime should be updated when the refreshToken changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lastReloadRequestTime = useMemo(() => new Date().getTime(), [refreshToken]);
  const [alertsSearchEsQuery, setAlertsSearchEsQuery] = useState<{ bool: BoolQuery }>();

  const alertsTableQuery = useMemo(() => {
    const baseRuleFilter = {
      term: {
        [ALERT_RULE_UUID]: rule.id,
      },
    };

    return {
      bool: {
        filter: [baseRuleFilter, ...(alertsSearchEsQuery ? [alertsSearchEsQuery] : [])],
      },
    };
  }, [alertsSearchEsQuery, rule.id]);

  const getDefaultAlertSummaryTimeRange = (): AlertSummaryTimeRange => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      utcFrom: thirtyDaysAgo.toISOString(),
      utcTo: now.toISOString(),
      fixedInterval: '1d',
    };
  };

  const [alertSummaryWidgetTimeRange, setAlertSummaryWidgetTimeRange] =
    useState<AlertSummaryTimeRange>(getDefaultAlertSummaryTimeRange);

  const { euiTheme } = useEuiTheme();

  const healthColor = getRuleHealthColor(rule, euiTheme);
  const statusMessage = getRuleStatusMessage({
    rule,
    licenseErrorText: ALERT_STATUS_LICENSE_ERROR,
    lastOutcomeTranslations: rulesLastRunOutcomeTranslationMapping,
    executionStatusTranslations: rulesStatusesTranslationsMapping,
  });

  const renderRuleAlertList = useCallback(() => {
    if (ruleType.hasAlertsMappings) {
      return (
        <AlertsTable
          id="rule-detail-alerts-table"
          ruleTypeIds={[ruleType.id]}
          query={alertsTableQuery}
          showAlertStatusWithFlapping
          columns={alertsTableColumns}
          renderActionsCell={RuleAlertActionsCell}
          actionsColumnWidth={120}
          lastReloadRequestTime={lastReloadRequestTime}
          getAlertFormatter={getAlertFormatter}
          casesConfiguration={{
            featureId: 'management',
            owner: ['cases'],
          }}
          services={{
            cases,
            data,
            http,
            notifications,
            fieldFormats,
            application,
            licensing,
            settings,
          }}
        />
      );
    }
  }, [
    application,
    cases,
    data,
    fieldFormats,
    getAlertFormatter,
    http,
    alertsTableQuery,
    lastReloadRequestTime,
    licensing,
    notifications,
    ruleType.hasAlertsMappings,
    ruleType.id,
    settings,
  ]);

  const renderRuleAlertsContent = useCallback(
    () => (
      <>
        <EuiSpacer size="m" />
        <RuleAlertSearchBar ruleTypeId={ruleType.id} onEsQueryChange={setAlertsSearchEsQuery} />
        <EuiSpacer size="s" />
        <EuiFlexGroup css={{ minHeight: 450 }} direction="column">
          <EuiFlexItem>{renderRuleAlertList()}</EuiFlexItem>
        </EuiFlexGroup>
      </>
    ),
    [renderRuleAlertList, ruleType.id]
  );

  const tabs = [
    {
      id: ALERT_LIST_TAB,
      name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.rule.alertsTabText', {
        defaultMessage: 'Alerts',
      }),
      'data-test-subj': 'ruleAlertListTab',
      content: renderRuleAlertsContent(),
    },
    {
      id: EVENT_LOG_LIST_TAB,
      name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.rule.eventLogTabText', {
        defaultMessage: 'History',
      }),
      'data-test-subj': 'eventLogListTab',
      content: suspendedComponentWithProps<RuleEventLogListProps<'stackManagement'>>(
        RuleEventLogList,
        'xl'
      )({
        fetchRuleSummary: false,
        ruleId: rule.id,
        ruleType,
        ruleSummary,
        numberOfExecutions,
        refreshToken,
        isLoadingRuleSummary: isLoadingChart,
        onChangeDuration,
        requestRefresh,
      }),
    },
  ];

  const renderTabs = () => {
    const isEnabled = getIsExperimentalFeatureEnabled('rulesDetailLogs');
    if (isEnabled) {
      return <EuiTabbedContent data-test-subj="ruleDetailsTabbedContent" tabs={tabs} />;
    }
    return renderRuleAlertsContent();
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem grow={2}>
          <RuleStatusPanelWithApi
            rule={rule}
            isEditable={!readOnly}
            healthColor={healthColor}
            statusMessage={statusMessage}
            requestRefresh={requestRefresh}
            refreshToken={refreshToken}
            autoRecoverAlerts={ruleType.autoRecoverAlerts}
          />
        </EuiFlexItem>
        <EuiFlexItem css={{ minWidth: 350 }}>
          <AlertSummaryWidget
            ruleTypeIds={[rule.ruleTypeId]}
            consumers={[rule.consumer]}
            filter={alertsSearchEsQuery}
            timeRange={alertSummaryWidgetTimeRange}
            onClick={() => {
              setAlertSummaryWidgetTimeRange(getDefaultAlertSummaryTimeRange());
            }}
            dependencies={{ charts, uiSettings }}
          />
        </EuiFlexItem>
        {suspendedComponentWithProps(
          RuleDefinition,
          'xl'
        )({
          rule,
          actionTypeRegistry,
          ruleTypeRegistry,
          hideEditButton: true,
          onEditRule: requestRefresh,
        })}
      </EuiFlexGroup>

      <EuiSpacer size="xl" />
      <input
        type="hidden"
        data-test-subj="alertsDurationEpoch"
        name="alertsDurationEpoch"
        value={durationEpoch}
      />
      {renderTabs()}
    </>
  );
}
export const RuleWithApi = withBulkRuleOperations(RuleComponent);

export function alertToListItem(
  durationEpoch: number,
  alertId: string,
  alert: AlertStatus
): AlertListItem {
  const isMuted = !!alert?.muted;
  const status = alert.status;
  const start = alert?.activeStartDate ? new Date(alert.activeStartDate) : undefined;
  const duration = start ? durationEpoch - start.valueOf() : 0;
  const sortPriority = getSortPriorityByStatus(alert?.status);
  const tracked = !!alert?.tracked;
  return {
    alert: alertId,
    status,
    start,
    duration,
    isMuted,
    sortPriority,
    flapping: alert.flapping,
    tracked,
    ...(alert.maintenanceWindowIds ? { maintenanceWindowIds: alert.maintenanceWindowIds } : {}),
  };
}

function getSortPriorityByStatus(status?: AlertStatusValues): number {
  switch (status) {
    case 'Active':
      return 0;
    case 'OK':
      return 1;
  }
  return 2;
}
