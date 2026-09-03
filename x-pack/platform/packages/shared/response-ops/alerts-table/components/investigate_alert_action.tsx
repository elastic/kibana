/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import {
  ALERT_FLAPPING,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  TIMESTAMP,
  isSiemRuleType,
} from '@kbn/rule-data-utils';
import React from 'react';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import { useInvestigateAlert } from '../hooks/use_investigate_alert';
import type { AdditionalContext, AlertActionsProps } from '../types';

const value = (field: unknown): unknown => (Array.isArray(field) ? field[0] : field);

export const InvestigateAlertAction = <AC extends AdditionalContext = AdditionalContext>({
  alert,
  investigationContext,
  onActionExecuted,
}: AlertActionsProps<AC>) => {
  const {
    services: { application, http, notifications },
  } = useAlertsTableContext();
  const id = String(value(alert[ALERT_UUID]) ?? alert._id ?? '');
  const ruleId = String(value(alert[ALERT_RULE_UUID]) ?? investigationContext?.ruleId ?? '');
  const ruleName = String(value(alert[ALERT_RULE_NAME]) ?? '');
  const ruleTypeId = String(
    value(alert[ALERT_RULE_TYPE_ID]) ?? investigationContext?.ruleTypeId ?? ''
  );
  const ruleCategory = String(value(alert[ALERT_RULE_CATEGORY]) ?? '');
  const reason = String(value(alert[ALERT_REASON]) ?? '');
  const status = String(value(alert[ALERT_STATUS]) ?? '');
  const start = String(value(alert[ALERT_START]) ?? value(alert[TIMESTAMP]) ?? '');
  const flapping = value(alert[ALERT_FLAPPING]);
  const optional = {
    url: value(alert['kibana.alert.url']),
    rule_tags: alert['kibana.alert.rule.tags'],
    grouping: value(alert['kibana.alert.grouping']),
    group: alert['kibana.alert.group'],
    evaluation: {
      value:
        alert['kibana.alert.evaluation.values'] ?? value(alert['kibana.alert.evaluation.value']),
      threshold: value(alert['kibana.alert.evaluation.threshold']),
    },
    rule_parameters: value(alert['kibana.alert.rule.parameters']),
    index_pattern: value(alert['kibana.alert.index_pattern']),
  };
  const canInvestigate = Boolean(
    !isSiemRuleType(ruleTypeId) &&
      id &&
      ruleId &&
      ruleName &&
      ruleTypeId &&
      ruleCategory &&
      reason &&
      status &&
      start
  );

  const { showInvestigateAction, handleInvestigate, isInvestigating, investigateActionLabel } =
    useInvestigateAlert({
      alertId: id,
      application,
      http,
      notifications,
      enabled: canInvestigate,
      onInvestigate: onActionExecuted,
      queryContext: AlertsQueryContext,
      startInvestigation: () =>
        http.post('/internal/nightshift/investigations', {
          body: JSON.stringify({
            subject: { type: 'alert', id },
            concurrency_key: id,
            context: {
              alerts: [
                {
                  id,
                  rule_id: ruleId,
                  rule_name: ruleName,
                  rule_type_id: ruleTypeId,
                  rule_category: ruleCategory,
                  reason,
                  status,
                  start,
                  ...(typeof flapping === 'boolean' ? { flapping } : {}),
                  ...(typeof optional.url === 'string' ? { url: optional.url } : {}),
                  ...(Array.isArray(optional.rule_tags) ? { rule_tags: optional.rule_tags } : {}),
                  ...(optional.grouping && typeof optional.grouping === 'object'
                    ? { grouping: optional.grouping }
                    : {}),
                  ...(Array.isArray(optional.group) ? { group: optional.group } : {}),
                  ...(optional.evaluation.value !== undefined ||
                  optional.evaluation.threshold !== undefined
                    ? { evaluation: optional.evaluation }
                    : {}),
                  ...(optional.rule_parameters && typeof optional.rule_parameters === 'object'
                    ? { rule_parameters: optional.rule_parameters }
                    : {}),
                  ...(typeof optional.index_pattern === 'string'
                    ? { index_pattern: optional.index_pattern }
                    : {}),
                },
              ],
            },
          }),
        }),
    });

  if (!showInvestigateAction) return null;

  return (
    <EuiContextMenuItem
      data-test-subj="investigateAlert"
      disabled={isInvestigating}
      onClick={handleInvestigate}
    >
      {investigateActionLabel}
    </EuiContextMenuItem>
  );
};
