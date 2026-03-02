/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useMemo, useState, useCallback } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTabbedContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoolQuery } from '@kbn/es-query';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { defaultAlertsTableColumns } from '@kbn/response-ops-alerts-table/configuration';
import type { AlertsTable as AlertsTableType } from '@kbn/response-ops-alerts-table';
import type { Rule, RuleType } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../common/lib/kibana';
import { UnifiedRulesAlertActions } from '../../components/alert_actions/alert_actions';
import {
  RULE_DETAILS_ALERTS_TAB,
  RULE_DETAILS_EXECUTION_TAB,
  RULE_DETAILS_PAGE_ID,
} from './constants';

const AlertsTable = lazy(() => import('@kbn/response-ops-alerts-table')) as AlertsTableType;

export type TabId = typeof RULE_DETAILS_ALERTS_TAB | typeof RULE_DETAILS_EXECUTION_TAB;

// We don't want to show the Feature column in the rule details page
const alertsTableColumns = [defaultAlertsTableColumns[0], ...defaultAlertsTableColumns.slice(2)];

interface RuleDetailsTabsProps {
  rule: Rule;
  ruleId: string;
  ruleType: RuleType | undefined;
  activeTabId: TabId;
  onSetTabId: (tabId: TabId) => void;
}

export const RuleDetailsTabs: React.FC<RuleDetailsTabsProps> = ({
  rule,
  ruleId,
  ruleType,
  activeTabId,
  onSetTabId,
}) => {
  const {
    data,
    http,
    notifications,
    fieldFormats,
    application,
    licensing,
    settings,
    cases,
    triggersActionsUi: { getRuleEventLogList: RuleEventLogList },
  } = useKibana().services;

  const [alertsSearchEsQuery] = useState<{ bool: BoolQuery }>();

  // Combine rule filter with any search bar filters
  const alertsTableQuery = useMemo(() => {
    const baseRuleFilter = {
      term: {
        [ALERT_RULE_UUID]: ruleId,
      },
    };

    return {
      bool: {
        filter: [baseRuleFilter, ...(alertsSearchEsQuery ? [alertsSearchEsQuery] : [])],
      },
    };
  }, [alertsSearchEsQuery, ruleId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lastReloadRequestTime = useMemo(() => new Date().getTime(), [alertsSearchEsQuery, ruleId]);

  const tabs: EuiTabbedContentTab[] = useMemo(
    () => [
      {
        id: RULE_DETAILS_ALERTS_TAB,
        name: i18n.translate('xpack.unifiedRules.ruleDetails.alertsTabText', {
          defaultMessage: 'Alerts',
        }),
        'data-test-subj': 'ruleAlertListTab',
        content: (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup css={{ minHeight: 450 }} direction="column">
              <EuiFlexItem>
                <AlertsTable
                  id={RULE_DETAILS_PAGE_ID}
                  ruleTypeIds={[rule.ruleTypeId]}
                  query={alertsTableQuery}
                  showAlertStatusWithFlapping
                  columns={alertsTableColumns}
                  renderActionsCell={UnifiedRulesAlertActions}
                  actionsColumnWidth={150}
                  lastReloadRequestTime={lastReloadRequestTime}
                  casesConfiguration={{
                    featureId: 'stackAlerts',
                    owner: ['cases'],
                  }}
                  services={{
                    data,
                    http,
                    notifications,
                    fieldFormats,
                    application,
                    licensing,
                    cases,
                    settings,
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ),
      },
      {
        id: RULE_DETAILS_EXECUTION_TAB,
        name: i18n.translate('xpack.unifiedRules.ruleDetails.executionHistoryTabText', {
          defaultMessage: 'Execution history',
        }),
        'data-test-subj': 'eventLogListTab',
        content: (
          <EuiFlexGroup css={{ minHeight: 600 }} direction="column">
            <EuiFlexItem>
              {rule && ruleType ? <RuleEventLogList ruleId={rule.id} ruleType={ruleType} /> : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    ],
    [
      rule,
      ruleType,
      alertsTableQuery,
      lastReloadRequestTime,
      data,
      http,
      notifications,
      fieldFormats,
      application,
      licensing,
      cases,
      settings,
      RuleEventLogList,
    ]
  );

  const handleTabIdChange = useCallback(
    (newTabId: TabId) => {
      onSetTabId(newTabId);
    },
    [onSetTabId]
  );

  return (
    <EuiTabbedContent
      data-test-subj="ruleDetailsTabbedContent"
      tabs={tabs}
      selectedTab={tabs.find((tab) => tab.id === activeTabId)}
      onTabClick={(tab) => handleTabIdChange(tab.id as TabId)}
    />
  );
};
