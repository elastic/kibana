/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable @kbn/eslint/no-restricted-paths

import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import React, { FC, memo, useCallback, useEffect, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import { ActionForm } from '../../../../../../../../../plugins/triggers_actions_ui/public';

import { useKibana } from '../../../../../lib/kibana';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertAction } from '../../../../../../../../../plugins/triggers_actions_ui/public/types';

import { setFieldValue } from '../../helpers';
import { RuleStep, RuleStepProps, ActionsStepRule } from '../../types';
import { StepRuleDescription } from '../description_step';
import { Form, UseField, useForm } from '../../../../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import { schema } from './schema';
import * as I18n from './translations';

interface StepRuleActionsProps extends RuleStepProps {
  defaultValues?: ActionsStepRule | null;
  isNew: boolean;
}

const stepActionsDefaultValue = {
  isNew: true,
  actions: [],
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
  const actionTypes = [
    { id: '.email', name: 'Email', enabled: true },
    { id: '.index', name: 'Index', enabled: true },
    { id: '.pagerduty', name: 'PagerDuty', enabled: true },
    { id: '.server-log', name: 'Server log', enabled: true },
    { id: '.servicenow', name: 'servicenow', enabled: true },
    { id: '.slack', name: 'Slack', enabled: true },
    { id: '.webhook', name: 'Webhook', enabled: true },
    { id: '.example-action', name: 'Example Action', enabled: true },
  ];
  const { http, triggers_actions_ui } = useKibana().services;
  const actionTypeRegistry = triggers_actions_ui.actionTypeRegistry;
  const [myStepData, setMyStepData] = useState<ActionsStepRule>(stepActionsDefaultValue);

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

  console.error('aa', myStepData);

  return isReadOnlyView && myStepData != null ? (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription direction={descriptionDirection} schema={schema} data={myStepData} />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="StepRuleActions">
          <UseField path="actions" defaultValue={myStepData.actions} />
        </Form>
      </StepContentWrapper>
      <ActionForm
        actions={myStepData.actions}
        messageVariables={['inputIndexes', 'outputIndex', 'name', 'alertId', 'ruleId', 'ruleLink']}
        defaultActionGroupId={'default'}
        setActionIdByIndex={(id: string, index: number) => {
          console.error('setActionIdByIndex', id, index);
          myStepData.actions[index].id = id;
        }}
        setAlertProperty={(updatedActions: AlertAction[]) => {
          console.error('setAlertProperty', updatedActions);
          setMyStepData({ ...myStepData, actions: updatedActions });
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setActionParamsProperty={(key: string, value: any, index: number) => {
          console.error('setActionParamsProperty', key, value, index);
          const newActions = [...myStepData.actions];
          newActions[index].params = { ...myStepData.actions[index].params, [key]: value };

          setMyStepData({
            ...myStepData,
            actions: newActions,
          });
        }}
        http={http}
        actionTypeRegistry={actionTypeRegistry}
        actionTypes={actionTypes}
        defaultActionMessage={'Alert [{{ctx.metadata.name}}] has exceeded the threshold'}
      />
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
