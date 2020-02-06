/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { FC, memo, useCallback, useEffect, useState } from 'react';

import { setFieldValue } from '../../helpers';
import { RuleStep, RuleStepProps, ScheduleStepRule } from '../../types';
import { StepRuleDescription } from '../description_step';
import { ScheduleItem } from '../schedule_item_form';
import { Form, UseField, useForm } from '../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import { schema } from './schema';
import * as I18n from './translations';

interface StepScheduleRuleProps extends RuleStepProps {
  defaultValues?: ScheduleStepRule | null;
}

const stepScheduleDefaultValue = {
  enabled: true,
  interval: '5m',
  isNew: true,
  from: '1m',
};

const StepScheduleRuleComponent: FC<StepScheduleRuleProps> = ({
  addPadding = false,
  defaultValues,
  descriptionDirection = 'row',
  isReadOnlyView,
  isLoading,
  isUpdateView = false,
  setStepData,
  setForm,
}) => {
  const [myStepData, setMyStepData] = useState<ScheduleStepRule>(stepScheduleDefaultValue);

  const { form } = useForm({
    defaultValue: myStepData,
    options: { stripEmptyFields: false },
    schema,
  });

  const onSubmit = useCallback(
    async (enabled: boolean) => {
      if (setStepData) {
        setStepData(RuleStep.scheduleRule, null, false);
        const { isValid: newIsValid, data } = await form.submit();
        if (newIsValid) {
          setStepData(RuleStep.scheduleRule, { ...data, enabled }, newIsValid);
          setMyStepData({ ...data, isNew: false } as ScheduleStepRule);
        }
      }
    },
    [form]
  );

  useEffect(() => {
    const { isNew, ...initDefaultValue } = myStepData;
    if (defaultValues != null && !isEqual(initDefaultValue, defaultValues)) {
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
      setForm(RuleStep.scheduleRule, form);
    }
  }, [form]);

  return isReadOnlyView && myStepData != null ? (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription direction={descriptionDirection} schema={schema} data={myStepData} />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepScheduleRule">
          <UseField
            path="interval"
            component={ScheduleItem}
            componentProps={{
              idAria: 'detectionEngineStepScheduleRuleInterval',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepScheduleRuleInterval',
            }}
          />
          <UseField
            path="from"
            component={ScheduleItem}
            componentProps={{
              idAria: 'detectionEngineStepScheduleRuleFrom',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepScheduleRuleFrom',
              minimumValue: 1,
            }}
          />
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

export const StepScheduleRule = memo(StepScheduleRuleComponent);
