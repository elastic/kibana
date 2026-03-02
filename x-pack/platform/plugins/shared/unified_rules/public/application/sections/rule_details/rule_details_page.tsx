/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import type { RuleExecutionStatuses } from '@kbn/alerting-plugin/common';
import { RuleExecutionStatusErrorReasons } from '@kbn/alerting-plugin/common';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../../common/lib/kibana';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { useFetchRuleTypes } from '../../hooks/use_fetch_rule_types';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { RulesPageTemplate } from '../rules_page/rules_page_template';
import { type TabId, RuleDetailsTabs } from './rule_details_tabs';
import {
  RULE_DETAILS_ALERTS_TAB,
  RULE_DETAILS_EXECUTION_TAB,
  RULE_DETAILS_TAB_URL_STORAGE_KEY,
} from './constants';
import { getAlertingSectionBreadcrumb } from '../../lib/breadcrumb';

interface RuleDetailsPathParams {
  ruleId: string;
}

const getHealthColor = (
  status: RuleExecutionStatuses,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
): string => {
  switch (status) {
    case 'active':
      return euiTheme.colors.success;
    case 'error':
      return euiTheme.colors.danger;
    case 'ok':
      return euiTheme.colors.primary;
    case 'pending':
      return euiTheme.colors.accent;
    case 'warning':
      return euiTheme.colors.warning;
    default:
      return 'subdued';
  }
};

const getStatusMessage = (rule: Rule): string => {
  if (rule.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License) {
    return i18n.translate('xpack.unifiedRules.ruleDetails.licenseError', {
      defaultMessage: 'License error',
    });
  }
  return statusTranslations[rule.executionStatus.status] ?? '';
};

const statusTranslations: Record<string, string> = {
  ok: i18n.translate('xpack.unifiedRules.ruleDetails.statusOk', { defaultMessage: 'Ok' }),
  active: i18n.translate('xpack.unifiedRules.ruleDetails.statusActive', {
    defaultMessage: 'Active',
  }),
  error: i18n.translate('xpack.unifiedRules.ruleDetails.statusError', {
    defaultMessage: 'Error',
  }),
  pending: i18n.translate('xpack.unifiedRules.ruleDetails.statusPending', {
    defaultMessage: 'Pending',
  }),
  unknown: i18n.translate('xpack.unifiedRules.ruleDetails.statusUnknown', {
    defaultMessage: 'Unknown',
  }),
  warning: i18n.translate('xpack.unifiedRules.ruleDetails.statusWarning', {
    defaultMessage: 'Warning',
  }),
};

export const RuleDetailsPage: React.FC = () => {
  const { services } = useKibana();
  const {
    application: { navigateToApp },
    triggersActionsUi: {
      actionTypeRegistry,
      ruleTypeRegistry,
      getAlertSummaryWidget: AlertSummaryWidget,
      getRuleDefinition: RuleDefinition,
      getRuleStatusPanel: RuleStatusPanel,
    },
    chrome,
  } = services;

  const { ruleId } = useParams<RuleDetailsPathParams>();
  const { rule, isLoading, isError, refetch } = useFetchRule({ ruleId });
  const { ruleTypes } = useFetchRuleTypes();
  const { euiTheme } = useEuiTheme();

  const [activeTabId, setActiveTabId] = useState<TabId>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlTabId = searchParams.get(RULE_DETAILS_TAB_URL_STORAGE_KEY);
    return urlTabId && [RULE_DETAILS_EXECUTION_TAB, RULE_DETAILS_ALERTS_TAB].includes(urlTabId)
      ? (urlTabId as TabId)
      : RULE_DETAILS_ALERTS_TAB;
  });

  const [isEditRuleFlyoutVisible, setEditRuleFlyoutVisible] = useState(false);

  const ruleType = ruleTypes?.find((type) => type.id === rule?.ruleTypeId);

  // Set breadcrumbs
  React.useEffect(() => {
    if (rule) {
      const rulesBreadcrumb = getAlertingSectionBreadcrumb('rules', true);
      chrome.setBreadcrumbs([
        {
          text: rulesBreadcrumb.text,
          href: rulesBreadcrumb.href,
        },
        { text: rule.name },
      ]);
    }
  }, [rule, chrome]);

  const handleEditRule = () => {
    if (rule) {
      navigateToApp('rules', {
        path: `/edit/${rule.id}`,
      });
    }
  };

  const handleCloseRuleFlyout = () => {
    setEditRuleFlyoutVisible(false);
  };

  if (isLoading) return <CenterJustifiedSpinner />;

  if (!rule || isError) {
    return (
      <RulesPageTemplate>
        <p>
          {i18n.translate('xpack.unifiedRules.ruleDetails.ruleNotFound', {
            defaultMessage: 'Rule not found',
          })}
        </p>
      </RulesPageTemplate>
    );
  }

  const healthColor = getHealthColor(rule.executionStatus.status, euiTheme);
  const statusMessage = getStatusMessage(rule);

  return (
    <RulesPageTemplate
      pageHeader={{
        pageTitle: rule.name,
        bottomBorder: false,
      }}
    >
      <EuiFlexGroup wrap gutterSize="m">
        <EuiFlexItem css={{ minWidth: 350 }}>
          <RuleStatusPanel
            rule={rule}
            isEditable={true}
            requestRefresh={refetch}
            healthColor={healthColor}
            statusMessage={statusMessage}
            autoRecoverAlerts={ruleType?.autoRecoverAlerts}
          />
        </EuiFlexItem>

        <EuiFlexItem css={{ minWidth: 350 }}>
          <AlertSummaryWidget
            ruleTypeIds={[rule.ruleTypeId]}
            consumers={[rule.consumer]}
            filter={{
              term: {
                'kibana.alert.rule.uuid': ruleId,
              },
            }}
            timeRange={{
              utcFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              utcTo: new Date().toISOString(),
              fixedInterval: '1d',
            }}
          />
        </EuiFlexItem>

        <RuleDefinition
          rule={rule}
          actionTypeRegistry={actionTypeRegistry}
          ruleTypeRegistry={ruleTypeRegistry}
          navigateToEditRuleForm={handleEditRule}
          onEditRule={async () => {
            refetch();
          }}
        />
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <RuleDetailsTabs
        rule={rule}
        ruleId={ruleId}
        ruleType={ruleType}
        activeTabId={activeTabId}
        onSetTabId={setActiveTabId}
      />

      {isEditRuleFlyoutVisible && (
        <RuleFormFlyout
          plugins={{ ...services, actionTypeRegistry, ruleTypeRegistry }}
          id={rule.id}
          onCancel={handleCloseRuleFlyout}
          onSubmit={() => {
            handleCloseRuleFlyout();
            refetch();
          }}
        />
      )}
    </RulesPageTemplate>
  );
};

// eslint-disable-next-line import/no-default-export
export default RuleDetailsPage;
