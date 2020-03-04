/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable @kbn/eslint/no-restricted-paths

import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import React, { FC, memo, useCallback, useEffect, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import memoizeOne from 'memoize-one';
import styled from 'styled-components';

import { ActionForm } from '../../../../../../../../../plugins/triggers_actions_ui/public';

import { useKibana } from '../../../../../lib/kibana';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertAction } from '../../../../../../../../../plugins/triggers_actions_ui/public/types';

import { setFieldValue } from '../../helpers';
import { RuleStep, RuleStepProps, ActionsStepRule } from '../../types';
import { StepRuleDescription } from '../description_step';
import { Form, UseField, useForm, SelectField } from '../../../../../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import { schema } from './schema';
import * as I18n from './translations';

const ACTION_TYPES = [
  { id: '.email', name: 'Email', enabled: true },
  { id: '.index', name: 'Index', enabled: false },
  { id: '.pagerduty', name: 'PagerDuty', enabled: true },
  { id: '.server-log', name: 'Server log', enabled: false },
  { id: '.servicenow', name: 'servicenow', enabled: false },
  { id: '.slack', name: 'Slack', enabled: true },
  { id: '.webhook', name: 'Webhook', enabled: false },
  { id: '.example-action', name: 'Example Action', enabled: false },
];

const DEFAULT_ACTION_GROUP_ID = 'default';
const DEFAULT_ACTION_MESSAGE = 'Rule generated {{state.signalsCount}} singals';

const MESSAGE_STATE_VARIABLES = ['signalsCount'];
const MESSAGE_CONTEXT_VARIABLES = [
  'inputIndexes',
  'outputIndex',
  'name',
  'alertId',
  'ruleId',
  'ruleLink',
];

const getMessageVariables = memoizeOne(() => {
  const stateVariables = MESSAGE_STATE_VARIABLES.map(variableName => `state.${variableName}`);
  const contextVariables = MESSAGE_CONTEXT_VARIABLES.map(variableName => `context.${variableName}`);

  return [...stateVariables, ...contextVariables];
});

const THROTTLE_OPTIONS = [
  // { value: 'signal', text: 'On each signal detected' },
  { value: null, text: 'On each rule execution' },
  { value: '6m', text: '6 minutes' },
  { value: '1h', text: 'Hourly' },
  { value: '1d', text: 'Daily' },
];

const StyledActionForm = styled(ActionForm)`
  .euiAccordionForm:first-child {
    border-top: none;
  }
`;

interface StepRuleActionsProps extends RuleStepProps {
  defaultValues?: ActionsStepRule | null;
}

const stepActionsDefaultValue = {
  enabled: true,
  isNew: true,
  actions: [],
  throttle: null,
};

const StepRuleActionsComponent: FC<StepRuleActionsProps> = ({
  addPadding = false,
  defaultValues,
  descriptionDirection = 'row',
  isReadOnlyView,
  isLoading,
  isUpdateView = false,
  setStepData,
  setForm,
}) => {
  const { http, triggers_actions_ui } = useKibana().services;
  const actionTypeRegistry = triggers_actions_ui.actionTypeRegistry;
  const [myStepData, setMyStepData] = useState<ActionsStepRule>(stepActionsDefaultValue);
  const messageVariables = getMessageVariables();

  const { form } = useForm({
    defaultValue: myStepData,
    options: { stripEmptyFields: false },
    schema,
  });

  const onSubmit = useCallback(
    async (enabled: boolean) => {
      if (setStepData) {
        setStepData(RuleStep.ruleActions, null, false);
        const { isValid: newIsValid, data } = await form.submit();
        if (newIsValid) {
          setStepData(RuleStep.ruleActions, { ...data, enabled }, newIsValid);
          setMyStepData({ ...data, isNew: false } as ActionsStepRule);
        }
      }
    },
    [form]
  );

  const setActionIdByIndex = useCallback(
    (id: string, index: number) => {
      const updatedActions = [...myStepData.actions];
      updatedActions[index].id = id;
      setMyStepData({ ...myStepData, actions: updatedActions });
    },
    [myStepData, setMyStepData]
  );

  const setAlertProperty = useCallback(
    (updatedActions: AlertAction[]) => {
      setMyStepData({ ...myStepData, actions: updatedActions });
    },
    [myStepData, setMyStepData]
  );

  const setActionParamsProperty = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: string, value: any, index: number) => {
      const newActions = [...myStepData.actions];
      newActions[index].params = { ...myStepData.actions[index].params, [key]: value };

      setMyStepData({
        ...myStepData,
        actions: newActions,
      });
    },
    [myStepData, setMyStepData]
  );

  useEffect(() => {
    const { isNew, ...initDefaultValue } = myStepData;
    if (defaultValues != null && !deepEqual(initDefaultValue, defaultValues)) {
      const myDefaultValues = {
        ...defaultValues,
        isNew: false,
      };
      setMyStepData(myDefaultValues);
      setFieldValue(form, schema, myDefaultValues);
    }
  }, [defaultValues]);

  useEffect(() => {
    if (setForm != null) {
      setForm(RuleStep.ruleActions, form);
    }
  }, [form]);

  return isReadOnlyView && myStepData != null ? (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription direction={descriptionDirection} schema={schema} data={myStepData} />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="StepRuleActions">
          <UseField
            path="throttle"
            component={SelectField}
            componentProps={{
              idAria: 'detectionEngineStepRuleActionsThrottle',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepRuleActionsThrottle',
              hasNoInitialSelection: false,
              euiFieldProps: {
                defaultVaule: null,
                options: THROTTLE_OPTIONS,
              },
            }}
          />
          <UseField path="actions" defaultValue={myStepData.actions}>
            {() => (
              <StyledActionForm
                actions={myStepData.actions}
                messageVariables={messageVariables}
                defaultActionGroupId={DEFAULT_ACTION_GROUP_ID}
                setActionIdByIndex={setActionIdByIndex}
                setAlertProperty={setAlertProperty}
                setActionParamsProperty={setActionParamsProperty}
                http={http}
                actionTypeRegistry={actionTypeRegistry}
                actionTypes={ACTION_TYPES}
                defaultActionMessage={DEFAULT_ACTION_MESSAGE}
              />
            )}
          </UseField>
        </Form>
      </StepContentWrapper>

      {!isUpdateView && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="xs"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                fill={false}
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={onSubmit.bind(null, false)}
              >
                {I18n.COMPLETE_WITHOUT_ACTIVATING}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={onSubmit.bind(null, true)}
              >
                {I18n.COMPLETE_WITH_ACTIVATING}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

export const StepRuleActions = memo(StepRuleActionsComponent);
