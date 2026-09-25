/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import type { IconType } from '@elastic/eui';
import {
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleNotifyWhenType } from '@kbn/alerting-plugin/common';
import { NOTIFY_WHEN_OPTIONS } from '@kbn/response-ops-rule-form';
import { useActionTypeModel } from '@kbn/alerts-ui-shared/src/common/hooks/use_action_type_model';
import { suspendedComponentWithProps } from '../../../lib/suspended_component_with_props';
import type { ActionTypeRegistryContract } from '../../../..';
import { useKibana } from '../../../../common/lib/kibana';
import { useFetchRuleActionConnectors } from '../../../hooks/use_fetch_rule_action_connectors';
import type { ActionTypeModel, RuleUiAction } from '../../../../types';

export interface RuleActionsProps {
  ruleActions: RuleUiAction[];
  actionTypeRegistry: ActionTypeRegistryContract;
  legacyNotifyWhen?: RuleNotifyWhenType | null;
}

const FALLBACK_ICON_TYPE: IconType = 'apps';

const getNotifyText = (
  action: RuleUiAction,
  isSystemAction?: boolean,
  legacyNotifyWhen?: RuleNotifyWhenType | null
): string | ReactNode => {
  if (isSystemAction) {
    return NOTIFY_WHEN_OPTIONS[1].value.inputDisplay;
  }

  if ('frequency' in action) {
    const notifyWhen = NOTIFY_WHEN_OPTIONS.find(
      (options) => options.value.value === action.frequency?.notifyWhen
    );

    return notifyWhen?.value.inputDisplay ?? action.frequency?.notifyWhen ?? legacyNotifyWhen ?? '';
  }

  return '';
};

/** Falls back to a generic icon when the action type model is unknown or has no icon. */
const getActionIconType = (iconClass: ActionTypeModel['iconClass'] | undefined): IconType => {
  if (iconClass === undefined || iconClass === null) {
    return FALLBACK_ICON_TYPE;
  }
  if (typeof iconClass === 'string') {
    return iconClass;
  }
  return suspendedComponentWithProps(iconClass as React.ComponentType);
};

interface RuleActionRowProps {
  action: RuleUiAction;
  actionName?: string;
  actionTypeRegistry: ActionTypeRegistryContract;
  index: number;
  legacyNotifyWhen?: RuleNotifyWhenType | null;
}

// Resolves the model through the registry first and falls back to the connector spec endpoint, so
// spec connectors (which are never registered on the client) still get their icon and metadata.
const RuleActionRow = ({
  action,
  actionName,
  actionTypeRegistry,
  index,
  legacyNotifyWhen,
}: RuleActionRowProps) => {
  const { http, docLinks, uiSettings } = useKibana().services;
  const { actionTypeId } = action;
  const { actionTypeModel } = useActionTypeModel({
    actionTypeRegistry,
    actionTypeId,
    http,
    docLinks,
    uiSettings,
  });
  const iconClass = actionTypeModel?.iconClass;
  const iconType = useMemo(() => getActionIconType(iconClass), [iconClass]);

  return (
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" gutterSize="s" component="span">
        <EuiFlexItem grow={false}>
          <EuiIcon
            size="m"
            type={iconType}
            data-test-subj={`ruleActionIcon${typeof iconType === 'string' ? `-${iconType}` : ''}`}
            aria-hidden={true}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            data-test-subj={`actionConnectorName-${index}-${actionName || actionTypeId}`}
            size="s"
          >
            {actionName}
          </EuiText>
          <EuiFlexGroup alignItems="center" gutterSize="xs" component="span">
            <EuiSpacer size="xs" />
            <EuiFlexItem grow={false}>
              <EuiIcon size="s" type="bell" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText
                data-test-subj={`actionConnectorName-notify-text${index}-${
                  actionName || actionTypeId
                }`}
                size="xs"
              >
                {String(
                  getNotifyText(action, actionTypeModel?.isSystemActionType, legacyNotifyWhen)
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
    </EuiFlexItem>
  );
};

export function RuleActions({
  ruleActions,
  actionTypeRegistry,
  legacyNotifyWhen,
}: RuleActionsProps) {
  const { isLoadingActionConnectors, actionConnectors } = useFetchRuleActionConnectors({
    ruleActions,
  });

  const hasConnectors = actionConnectors && actionConnectors.length > 0;

  const hasActions = ruleActions && ruleActions.length > 0;

  if (!hasConnectors || !hasActions) {
    return (
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate('xpack.triggersActionsUI.ruleDetails.noActions', {
            defaultMessage: 'No actions',
          })}
        </EuiText>
      </EuiFlexItem>
    );
  }

  const getActionName = (connectorId?: string) => {
    const actionConnector = actionConnectors.find((connector) => connector.id === connectorId);
    return actionConnector?.name;
  };

  if (isLoadingActionConnectors) return <EuiLoadingSpinner size="s" />;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      {ruleActions.map((action, index) => (
        <RuleActionRow
          key={index}
          action={action}
          actionName={getActionName(action.id)}
          actionTypeRegistry={actionTypeRegistry}
          index={index}
          legacyNotifyWhen={legacyNotifyWhen}
        />
      ))}
    </EuiFlexGroup>
  );
}
