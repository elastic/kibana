/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useMemo } from 'react';
import { EuiCallOut, EuiErrorBoundary, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { ActionVariable, RuleActionParam } from '@kbn/alerting-types';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { ActionConnectorMode, useGeneratedActionMessage } from '@kbn/alerts-ui-shared';
import { useRuleFormState } from '../hooks';
import type { RuleAction, RuleUiAction } from '../common';
import { getSelectedActionGroup } from '../utils';

export interface RuleActionsMessageProps {
  action: RuleUiAction;
  index: number;
  templateFields: ActionVariable[];
  connector: ActionConnector;
  producerId: string;
  warning?: string | null;
  onParamsChange: (key: string, value: RuleActionParam) => void;
}

export const RuleActionsMessage = (props: RuleActionsMessageProps) => {
  const { action, index, templateFields, connector, producerId, warning, onParamsChange } = props;

  const {
    plugins: { actionTypeRegistry },
    actionsParamsErrors = {},
    selectedRuleType,
    selectedRuleTypeModel,
    connectorTypes,
  } = useRuleFormState();

  const actionTypeModel = actionTypeRegistry.get(action.actionTypeId);

  const ParamsFieldsComponent = actionTypeModel.actionParamsFields;

  const actionsParamsError = actionsParamsErrors[action.uuid!] || {};

  const isSystemAction = useMemo(() => {
    return connectorTypes.some((actionType) => {
      return actionType.id === action.actionTypeId && actionType.isSystemActionType;
    });
  }, [action, connectorTypes]);

  const selectedActionGroup = useMemo(() => {
    if (isSystemAction) {
      return;
    }

    return getSelectedActionGroup({
      group: (action as RuleAction).group,
      ruleType: selectedRuleType,
      ruleTypeModel: selectedRuleTypeModel,
    });
  }, [isSystemAction, action, selectedRuleType, selectedRuleTypeModel]);

  const template = useMemo(() => {
    if (isSystemAction) {
      return selectedRuleTypeModel.defaultSummaryMessage;
    }
    return (action as RuleAction).frequency?.summary
      ? selectedRuleTypeModel.defaultSummaryMessage
      : selectedActionGroup?.defaultActionMessage ?? selectedRuleTypeModel.defaultActionMessage;
  }, [isSystemAction, action, selectedRuleTypeModel, selectedActionGroup]);

  const groupKey = useMemo(() => {
    if (isSystemAction) {
      return 'system';
    }
    const summary = !!(action as RuleAction).frequency?.summary;
    const group = (action as RuleAction).group ?? '';
    return `${group}|${summary ? 'summary' : 'action'}`;
  }, [isSystemAction, action]);

  const onMessageOwnerChange = useCallback(
    (partial: Partial<any>) => {
      for (const [key, value] of Object.entries(partial)) {
        onParamsChange(key, value as RuleActionParam);
      }
    },
    [onParamsChange]
  );

  useGeneratedActionMessage({
    template,
    groupKey,
    messageField: actionTypeModel.messageField,
    params: action.params as any,
    onChange: onMessageOwnerChange,
  });

  if (!ParamsFieldsComponent) {
    return null;
  }

  return (
    <EuiErrorBoundary>
      <EuiFlexGroup direction="column" data-test-subj="ruleActionsMessage">
        <EuiFlexItem>
          <Suspense fallback={null}>
            <ParamsFieldsComponent
              actionParams={action.params as any}
              errors={actionsParamsError}
              index={index}
              selectedActionGroupId={selectedActionGroup?.id}
              editAction={onParamsChange}
              messageVariables={templateFields}
              actionConnector={connector}
              executionMode={ActionConnectorMode.ActionForm}
              ruleTypeId={selectedRuleType.id}
              producerId={producerId}
            />
            {warning ? (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut announceOnMount size="s" color="warning" title={warning} />
              </>
            ) : null}
          </Suspense>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiErrorBoundary>
  );
};
