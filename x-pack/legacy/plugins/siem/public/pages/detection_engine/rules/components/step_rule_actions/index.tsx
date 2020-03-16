/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable @kbn/eslint/no-restricted-paths

import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import React, { FC, memo, useCallback, useEffect, useState } from 'react';
import deepEqual from 'fast-deep-equal';

import { setFieldValue } from '../../helpers';
import { RuleStep, RuleStepProps, ActionsStepRule } from '../../types';
import { StepRuleDescription } from '../description_step';
import { Form, UseField, useForm } from '../../../../../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import { ThrottleSelectField, THROTTLE_OPTIONS } from '../throttle_select_field';
import { RuleActionsField } from '../rule_actions_field';
import { schema } from './schema';
import * as I18n from './translations';

interface StepRuleActionsProps extends RuleStepProps {
  defaultValues?: ActionsStepRule | null;
}

const stepActionsDefaultValue = {
  enabled: true,
  isNew: true,
  actions: [],
  throttle: THROTTLE_OPTIONS[0].value,
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

  const updateThrottle = useCallback(throttle => setMyStepData({ ...myStepData, throttle }), [
    myStepData,
    setMyStepData,
  ]);

  return isReadOnlyView && myStepData != null ? (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription direction={descriptionDirection} schema={schema} data={myStepData} />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepRuleActions">
          <UseField
            path="throttle"
            component={ThrottleSelectField}
            componentProps={{
              idAria: 'detectionEngineStepRuleActionsThrottle',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepRuleActionsThrottle',
              hasNoInitialSelection: false,
              handleChange: updateThrottle,
              euiFieldProps: {
                options: THROTTLE_OPTIONS,
              },
            }}
          />
          {myStepData.throttle !== stepActionsDefaultValue.throttle && (
            <>
              <EuiSpacer />
              <UseField
                path="actions"
                defaultValue={myStepData.actions}
                component={RuleActionsField}
              />
            </>
          )}
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
                data-test-subj="create-activate"
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
