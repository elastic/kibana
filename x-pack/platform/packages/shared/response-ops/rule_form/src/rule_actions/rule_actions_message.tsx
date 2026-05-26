/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActionVariable, RuleActionParam } from '@kbn/alerting-types';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { ActionConnectorMode } from '@kbn/alerts-ui-shared';
import { useActionTypeModel } from '@kbn/alerts-ui-shared/src/common/hooks/use_action_type_model';
import { useRuleFormState } from '../hooks';
import type { RuleAction, RuleUiAction } from '../common';
import { getSelectedActionGroup } from '../utils';
import { ACTION_USE_AAD_TEMPLATE_FIELDS_LABEL } from '../translations';

export interface RuleActionsMessageProps {
  action: RuleUiAction;
  index: number;
  templateFields: ActionVariable[];
  useDefaultMessage: boolean;
  connector: ActionConnector;
  producerId: string;
  warning?: string | null;
  onParamsChange: (key: string, value: RuleActionParam) => void;
  onUseAadTemplateFieldsChange?: () => void;
}

export const RuleActionsMessage = (props: RuleActionsMessageProps) => {
  const {
    action,
    index,
    templateFields,
    useDefaultMessage,
    connector,
    producerId,
    warning,
    onParamsChange,
    onUseAadTemplateFieldsChange,
  } = props;

  const {
    plugins: { actionTypeRegistry, http },
    actionsParamsErrors = {},
    selectedRuleType,
    selectedRuleTypeModel,
    connectorTypes,
    showMustacheAutocompleteSwitch,
  } = useRuleFormState();

  const actionType = useMemo(
    () => connectorTypes.find((ct) => ct.id === action.actionTypeId) ?? null,
    [connectorTypes, action.actionTypeId]
  );

  const {
    actionTypeModel,
    isLoading,
    error,
    refetch: refetchConnectorSpec,
  } = useActionTypeModel({
    actionTypeRegistry,
    actionTypeId: actionType?.id,
    source: actionType?.source,
    http,
  });

  const ParamsFieldsComponent = actionTypeModel?.actionParamsFields;

  const actionsParamsError = actionsParamsErrors[action.uuid!] || {};

  const isSystemAction = useMemo(() => {
    return connectorTypes.some((ct) => {
      return ct.id === action.actionTypeId && ct.isSystemActionType;
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

  const defaultMessage = useMemo(() => {
    if (isSystemAction) {
      return selectedRuleTypeModel.defaultSummaryMessage;
    }

    // if action is a summary action, show the default summary message
    return (action as RuleAction).frequency?.summary
      ? selectedRuleTypeModel.defaultSummaryMessage
      : selectedActionGroup?.defaultActionMessage ?? selectedRuleTypeModel.defaultActionMessage;
  }, [isSystemAction, action, selectedRuleTypeModel, selectedActionGroup]);

  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  if (error) {
    return (
      <EuiCallOut
        color="danger"
        iconType="error"
        size="s"
        title={i18n.translate('xpack.responseOps.ruleForm.ruleActionsMessage.specLoadErrorTitle', {
          defaultMessage: 'Failed to load action configuration',
        })}
      >
        <p>
          {i18n.translate(
            'xpack.responseOps.ruleForm.ruleActionsMessage.specLoadErrorDescription',
            {
              defaultMessage:
                'There was an error loading the connector configuration. Check your connection and try again.',
            }
          )}
        </p>
        <EuiSpacer size="s" />
        <EuiButton
          data-test-subj="connector-spec-load-retry"
          onClick={() => refetchConnectorSpec()}
        >
          {i18n.translate('xpack.responseOps.ruleForm.ruleActionsMessage.specLoadErrorRetry', {
            defaultMessage: 'Retry',
          })}
        </EuiButton>
      </EuiCallOut>
    );
  }

  if (!actionTypeModel || !ParamsFieldsComponent) {
    return null;
  }

  return (
    <EuiErrorBoundary>
      <EuiFlexGroup direction="column" data-test-subj="ruleActionsMessage">
        {showMustacheAutocompleteSwitch && onUseAadTemplateFieldsChange && (
          <EuiFlexItem>
            <EuiSwitch
              label={ACTION_USE_AAD_TEMPLATE_FIELDS_LABEL}
              checked={(action as RuleAction).useAlertDataForTemplate || false}
              onChange={onUseAadTemplateFieldsChange}
              data-test-subj="ruleActionsMessageUseAadTemplateFieldsSwitch"
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <Suspense fallback={null}>
            <ParamsFieldsComponent
              actionParams={action.params as any}
              errors={actionsParamsError}
              index={index}
              selectedActionGroupId={selectedActionGroup?.id}
              editAction={onParamsChange}
              messageVariables={templateFields}
              defaultMessage={defaultMessage}
              useDefaultMessage={useDefaultMessage}
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
