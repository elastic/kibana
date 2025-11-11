/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiAccordion,
  EuiButtonIcon,
  EuiText,
  EuiBadge,
  EuiErrorBoundary,
  EuiIconTip,
  EuiBetaBadge,
  EuiSplitPanel,
  EuiCallOut,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { isEmpty, partition, some } from 'lodash';
import type {
  ActionVariable,
  RuleActionParam,
  RuleActionFrequency,
} from '@kbn/alerting-plugin/common';
import {
  getDurationNumberInItsUnit,
  getDurationUnitValue,
  parseDuration,
} from '@kbn/alerting-plugin/common/parse_duration';
import { RuleActionsNotifyWhen } from '@kbn/response-ops-rule-form';
import type { ActionGroupWithMessageVariables } from '@kbn/triggers-actions-ui-types';
import { checkActionFormActionTypeEnabled, transformActionVariables } from '@kbn/alerts-ui-shared';
import { TECH_PREVIEW_DESCRIPTION, TECH_PREVIEW_LABEL } from '../translations';
import type {
  IErrorObject,
  RuleSystemAction,
  ActionTypeIndex,
  ActionConnector,
  ActionVariables,
  ActionTypeRegistryContract,
  NotifyWhenSelectOptions,
} from '../../../types';
import { ActionConnectorMode } from '../../../types';
import type { ActionAccordionFormProps } from './action_form';
import { useKibana } from '../../../common/lib/kibana';
import { validateParamsForWarnings } from '../../lib/validate_params_for_warnings';
import { useRuleTypeAlertFields } from '../../hooks/use_rule_alert_fields';

export type SystemActionTypeFormProps = {
  actionItem: RuleSystemAction;
  actionConnector: ActionConnector;
  index: number;
  onDeleteAction: () => void;
  setActionParamsProperty: (key: string, value: RuleActionParam, index: number) => void;
  setActionFrequencyProperty: (key: string, value: RuleActionParam, index: number) => void;
  actionTypesIndex: ActionTypeIndex;
  connectors: ActionConnector[];
  actionTypeRegistry: ActionTypeRegistryContract;
  featureId: string;
  producerId: string;
  ruleTypeId?: string;
  disableErrorMessages?: boolean;
  hasAlertsMappings?: boolean;
  minimumThrottleInterval?: [number | undefined, string];
  notifyWhenSelectOptions?: NotifyWhenSelectOptions[];
  hideNotifyWhen?: boolean;
  defaultRuleFrequency?: RuleActionFrequency;
} & Pick<
  ActionAccordionFormProps,
  | 'setActionParamsProperty'
  | 'messageVariables'
  | 'summaryMessageVariables'
  | 'defaultActionMessage'
  | 'defaultSummaryMessage'
>;

export const SystemActionTypeForm = ({
  actionItem,
  actionConnector,
  index,
  onDeleteAction,
  setActionParamsProperty,
  setActionFrequencyProperty,
  actionTypesIndex,
  connectors,
  defaultActionMessage,
  messageVariables,
  summaryMessageVariables,
  actionTypeRegistry,
  defaultSummaryMessage,
  producerId,
  featureId,
  ruleTypeId,
  disableErrorMessages,
  hasAlertsMappings,
  minimumThrottleInterval,
  notifyWhenSelectOptions,
  hideNotifyWhen = false,
  defaultRuleFrequency,
}: SystemActionTypeFormProps) => {
  const { http } = useKibana().services;
  const [isOpen, setIsOpen] = useState(true);
  const [actionParamsErrors, setActionParamsErrors] = useState<{ errors: IErrorObject }>({
    errors: {},
  });

  const { euiTheme } = useEuiTheme();

  // State management for throttle values
  const [actionThrottle, setActionThrottle] = useState<number | null>(
    actionItem.frequency?.throttle
      ? getDurationNumberInItsUnit(actionItem.frequency.throttle)
      : null
  );
  const [actionThrottleUnit, setActionThrottleUnit] = useState<string>(
    actionItem.frequency?.throttle ? getDurationUnitValue(actionItem.frequency?.throttle) : 'h'
  );
  const [minimumActionThrottle = -1, minimumActionThrottleUnit = 's'] = minimumThrottleInterval ?? [
    -1,
    's',
  ];

  const [showMinimumThrottleWarning, showMinimumThrottleUnitWarning] = useMemo(() => {
    try {
      if (!actionThrottle) return [false, false];
      const throttleUnitDuration = parseDuration(`1${actionThrottleUnit}`);
      const minThrottleUnitDuration = parseDuration(`1${minimumActionThrottleUnit}`);
      const boundedThrottle =
        throttleUnitDuration > minThrottleUnitDuration
          ? actionThrottle
          : Math.max(actionThrottle, minimumActionThrottle);
      const boundedThrottleUnit =
        parseDuration(`${actionThrottle}${actionThrottleUnit}`) >= minThrottleUnitDuration
          ? actionThrottleUnit
          : minimumActionThrottleUnit;
      return [boundedThrottle !== actionThrottle, boundedThrottleUnit !== actionThrottleUnit];
    } catch (e) {
      return [false, false];
    }
  }, [actionThrottle, actionThrottleUnit, minimumActionThrottle, minimumActionThrottleUnit]);

  const actAccordionActionFormCss = css`
    .actAccordionActionForm {
      background-color: ${euiTheme.colors.lightestShade};

      .euiCard {
        box-shador: none;
      }
      .actAccordionActionForm__button {
        padding: ${euiTheme.size.m};
        padding-left: ${euiTheme.size.l};
      }

      .euiAccordion__arrow {
        transform: translateX(${euiTheme.size.m}) rotate(0deg) !important;
      }

      .euiAccordion__arrow[aria-expanded='true'] {
        transform: translateX(${euiTheme.size.m}) rotate(90deg) !important;
      }
    }
  `;

  const [warning, setWarning] = useState<string | null>(null);

  const { fields: alertFields } = useRuleTypeAlertFields(http, ruleTypeId, true);

  const getDefaultParams = useCallback(() => {
    const connectorType = actionTypeRegistry.get(actionItem.actionTypeId);

    return connectorType.defaultActionParams;
  }, [actionItem.actionTypeId, actionTypeRegistry]);

  const availableActionVariables = useMemo(
    () =>
      messageVariables
        ? getAvailableActionVariables(messageVariables, summaryMessageVariables, undefined, true)
        : [],
    [messageVariables, summaryMessageVariables]
  );

  useEffect(() => {
    const defaultParams = getDefaultParams();

    if (defaultParams) {
      for (const [key, paramValue] of Object.entries(defaultParams)) {
        const defaultAADParams: typeof defaultParams = {};
        if (actionItem.params[key] === undefined || actionItem.params[key] === null) {
          setActionParamsProperty(key, paramValue, index);
          // Add default param to AAD defaults only if it does not contain any template code
          if (typeof paramValue !== 'string' || !paramValue.match(/{{.*?}}/g)) {
            defaultAADParams[key] = paramValue;
          }
        }
      }
    }
  }, [
    actionItem.params,
    getDefaultParams,
    index,
    messageVariables,
    setActionParamsProperty,
    summaryMessageVariables,
  ]);

  useEffect(() => {
    const defaultParams = getDefaultParams();

    if (defaultParams) {
      const defaultAADParams: typeof defaultParams = {};
      for (const [key, paramValue] of Object.entries(defaultParams)) {
        setActionParamsProperty(key, paramValue, index);
        if (!paramValue.match(/{{.*?}}/g)) {
          defaultAADParams[key] = paramValue;
        }
      }
    }
  }, [getDefaultParams, index, setActionParamsProperty]);

  useEffect(() => {
    (async () => {
      if (disableErrorMessages) {
        setActionParamsErrors({ errors: {} });
        return;
      }
      const res: { errors: IErrorObject } = await actionTypeRegistry
        .get(actionItem.actionTypeId)
        ?.validateParams(actionItem.params);
      setActionParamsErrors(res);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionItem, disableErrorMessages]);

  // Sync throttle state when actionItem.frequency changes
  useEffect(() => {
    if (actionItem.frequency?.throttle) {
      setActionThrottle(getDurationNumberInItsUnit(actionItem.frequency.throttle));
      setActionThrottleUnit(getDurationUnitValue(actionItem.frequency.throttle));
    } else {
      setActionThrottle(null);
      setActionThrottleUnit('h');
    }
  }, [actionItem.frequency]);

  // Frequency change handler
  const onActionFrequencyChange = useCallback(
    (frequency: RuleActionFrequency | undefined) => {
      if (!frequency) return;

      const { notifyWhen, throttle, summary } = frequency;

      if (notifyWhen !== undefined) {
        setActionFrequencyProperty('notifyWhen', notifyWhen, index);
      }

      if (throttle) {
        setActionThrottle(getDurationNumberInItsUnit(throttle));
        setActionThrottleUnit(getDurationUnitValue(throttle));
      }

      setActionFrequencyProperty('throttle', throttle ? throttle : null, index);

      if (summary !== undefined) {
        setActionFrequencyProperty('summary', summary, index);
      }
    },
    [setActionFrequencyProperty, index]
  );

  // Note: System actions don't support action groups, so we don't implement group selection

  // Frequency UI component
  const actionNotifyWhen = (
    <RuleActionsNotifyWhen
      frequency={actionItem.frequency ?? defaultRuleFrequency}
      throttle={actionThrottle}
      throttleUnit={actionThrottleUnit}
      hasAlertsMappings={hasAlertsMappings}
      onChange={onActionFrequencyChange}
      showMinimumThrottleWarning={showMinimumThrottleWarning}
      showMinimumThrottleUnitWarning={showMinimumThrottleUnitWarning}
      notifyWhenSelectOptions={notifyWhenSelectOptions}
      onUseDefaultMessage={() => {}}
    />
  );

  const actionTypeRegistered = actionTypeRegistry.get(actionConnector.actionTypeId);
  if (!actionTypeRegistered) return null;

  const showActionGroupErrorIcon = (): boolean => {
    return !isOpen && some(actionParamsErrors.errors, (error) => !isEmpty(error));
  };

  const ParamsFieldsComponent = actionTypeRegistered.actionParamsFields;
  const checkEnabledResult = checkActionFormActionTypeEnabled(
    actionTypesIndex[actionConnector.actionTypeId],
    []
  );

  const accordionContent = checkEnabledResult.isEnabled ? (
    <>
      <EuiSplitPanel.Inner
        color="subdued"
        style={{ borderBottom: `1px solid ${euiTheme.colors.lightShade}` }}
      >
        {!hideNotifyWhen && actionNotifyWhen}
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner color="plain">
        {ParamsFieldsComponent ? (
          <EuiErrorBoundary>
            <EuiFlexGroup gutterSize="m" direction="column">
              <EuiFlexItem>
                <Suspense fallback={null}>
                  <ParamsFieldsComponent
                    actionParams={actionItem.params as any}
                    errors={actionParamsErrors.errors}
                    index={index}
                    editAction={(key: string, value: RuleActionParam, i: number) => {
                      setWarning(
                        validateParamsForWarnings(
                          value,
                          http.basePath.publicBaseUrl,
                          availableActionVariables
                        )
                      );
                      setActionParamsProperty(key, value, i);
                    }}
                    messageVariables={alertFields}
                    defaultMessage={defaultSummaryMessage}
                    useDefaultMessage={true}
                    actionConnector={actionConnector}
                    executionMode={ActionConnectorMode.ActionForm}
                    ruleTypeId={ruleTypeId}
                    producerId={producerId}
                    featureId={featureId}
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
        ) : null}
      </EuiSplitPanel.Inner>
    </>
  ) : (
    checkEnabledResult.messageCard
  );

  return (
    <>
      <EuiSplitPanel.Outer hasShadow={isOpen} css={actAccordionActionFormCss}>
        <EuiAccordion
          initialIsOpen={true}
          key={index}
          id={index.toString()}
          onToggle={setIsOpen}
          paddingSize="none"
          className="actAccordionActionForm"
          buttonContentClassName="actAccordionActionForm__button"
          data-test-subj={`alertActionAccordion-${index}`}
          buttonContent={
            <ButtonContent
              showActionGroupErrorIcon={showActionGroupErrorIcon()}
              showWarning={Boolean(warning && !isOpen)}
              connectorName={actionConnector.name}
              isExperimental={Boolean(actionTypeRegistered && actionTypeRegistered.isExperimental)}
              iconClass={actionTypeRegistered.iconClass ?? 'empty'}
            />
          }
          extraAction={
            <EuiButtonIcon
              iconType="minusInCircle"
              color="danger"
              className="actAccordionActionForm__extraAction"
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.sections.actionTypeForm.accordion.deleteIconAriaLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              onClick={onDeleteAction}
              data-test-subj="system-action-delete-button"
            />
          }
        >
          {accordionContent}
        </EuiAccordion>
      </EuiSplitPanel.Outer>
      <EuiSpacer size="l" />
    </>
  );
};

function getAvailableActionVariables(
  actionVariables: ActionVariables,
  summaryActionVariables?: ActionVariables,
  actionGroup?: ActionGroupWithMessageVariables,
  isSummaryAction?: boolean
) {
  const transformedActionVariables: ActionVariable[] = transformActionVariables(
    actionVariables,
    summaryActionVariables,
    actionGroup?.omitMessageVariables,
    isSummaryAction
  );

  // partition deprecated items so they show up last
  const partitionedActionVariables = partition(
    transformedActionVariables,
    (v) => v.deprecated !== true
  );
  return partitionedActionVariables.reduce((acc, curr) => {
    return [
      ...acc,
      ...curr.sort((a, b) => a.name.toUpperCase().localeCompare(b.name.toUpperCase())),
    ];
  }, []);
}

const ButtonContent: React.FC<{
  showActionGroupErrorIcon: boolean;
  iconClass: string | IconType;
  connectorName: string;
  showWarning: boolean;
  isExperimental: boolean;
}> = ({ showActionGroupErrorIcon, iconClass, showWarning, isExperimental, connectorName }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {showActionGroupErrorIcon ? (
        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={i18n.translate(
              'xpack.triggersActionsUI.sections.actionTypeForm.actionErrorToolTip',
              { defaultMessage: 'Action contains errors.' }
            )}
            type="warning"
            color="danger"
            size="m"
            iconProps={{
              'data-test-subj': 'action-group-error-icon',
            }}
          />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconClass} size="m" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiText>
          <div>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <FormattedMessage
                  defaultMessage="{actionConnectorName}"
                  id="xpack.triggersActionsUI.sections.actionTypeForm.existingAlertActionTypeEditTitle"
                  values={{
                    actionConnectorName: `${connectorName}`,
                  }}
                />
              </EuiFlexItem>
              {showWarning && (
                <EuiFlexItem grow={false}>
                  <EuiBadge data-test-subj="warning-badge" iconType="warning" color="warning">
                    {i18n.translate(
                      'xpack.triggersActionsUI.sections.actionTypeForm.actionWarningsTitle',
                      {
                        defaultMessage: '1 warning',
                      }
                    )}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </div>
        </EuiText>
      </EuiFlexItem>
      {isExperimental && (
        <EuiFlexItem grow={false}>
          <EuiBetaBadge
            data-test-subj="action-type-form-beta-badge"
            label={TECH_PREVIEW_LABEL}
            tooltipContent={TECH_PREVIEW_DESCRIPTION}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
