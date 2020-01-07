/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { isEqual, get } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { RuleStep, RuleStepProps, ScheduleStepRule } from '../../types';
import { StepRuleDescription } from '../description_step';
import { ScheduleItem } from '../schedule_item_form';
import { Form, UseField, useForm } from '../shared_imports';
import { schema } from './schema';
import * as I18n from './translations';

interface StepScheduleRuleProps extends RuleStepProps {
  defaultValues?: ScheduleStepRule | null;
}

const stepScheduleDefaultValue = {
  enabled: true,
  interval: '5m',
  isNew: true,
  from: '0m',
};

export const StepScheduleRule = memo<StepScheduleRuleProps>(
  ({
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
        if (!isReadOnlyView) {
          Object.keys(schema).forEach(key => {
            const val = get(key, myDefaultValues);
            if (val != null) {
              form.setFieldValue(key, val);
            }
          });
        }
      }
    }, [defaultValues]);

    useEffect(() => {
      if (setForm != null) {
        setForm(RuleStep.scheduleRule, form);
      }
    }, [form]);

    return isReadOnlyView && myStepData != null ? (
      <StepRuleDescription data={myStepData} direction={descriptionDirection} schema={schema} />
    ) : (
      <>
        <Form data-test-subj="stepScheduleRule" form={form}>
          <UseField
            component={ScheduleItem}
            componentProps={{
              compressed: true,
              idAria: 'detectionEngineStepScheduleRuleInterval',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepScheduleRuleInterval',
            }}
            path="interval"
          />
          <UseField
            component={ScheduleItem}
            componentProps={{
              compressed: true,
              idAria: 'detectionEngineStepScheduleRuleFrom',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepScheduleRuleFrom',
            }}
            path="from"
          />
        </Form>

        {!isUpdateView && (
          <>
            <EuiHorizontalRule margin="s" />
            <EuiFlexGroup
              alignItems="center"
              gutterSize="xs"
              justifyContent="flexEnd"
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
                  isDisabled={isLoading}
                  isLoading={isLoading}
                  fill
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
  }
);
