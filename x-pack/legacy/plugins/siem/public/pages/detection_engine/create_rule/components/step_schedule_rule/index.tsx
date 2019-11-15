/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import React, { memo, useCallback } from 'react';

import {
  useForm,
  Form,
  UseField,
} from '../../../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';

import { RuleStep, RuleStepProps } from '../../types';
import { ScheduleItem } from '../schedule_item_form';

import { schema } from './schema';
import * as I18n from './translations';

export const StepScheduleRule = memo<RuleStepProps>(({ isLoading, setStepData }) => {
  const { form } = useForm({
    schema,
    defaultValue: {
      interval: '5m',
      from: '0m',
    },
    options: { stripEmptyFields: false },
  });

  const onSubmit = useCallback(
    async (enabled: boolean) => {
      const { isValid: newIsValid, data } = await form.submit();
      if (newIsValid) {
        setStepData(RuleStep.scheduleRule, { ...data, enabled }, newIsValid);
      }
    },
    [form]
  );

  return (
    <>
      <Form form={form} data-test-subj="stepScheduleRule">
        <UseField
          path="interval"
          component={ScheduleItem}
          componentProps={{
            compressed: true,
            idAria: 'detectionEngineStepScheduleRuleInterval',
            isDisabled: isLoading,
            dataTestSubj: 'detectionEngineStepScheduleRuleInterval',
          }}
        />
        <UseField
          path="from"
          component={ScheduleItem}
          componentProps={{
            compressed: true,
            idAria: 'detectionEngineStepScheduleRuleFrom',
            isDisabled: isLoading,
            dataTestSubj: 'detectionEngineStepScheduleRuleFrom',
          }}
        />
      </Form>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd" gutterSize="xs" responsive={false}>
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
  );
});
