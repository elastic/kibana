/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiHorizontalRule, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual, get } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { RuleStepProps, RuleStep, AboutStepRule } from '../../types';
import * as RuleI18n from '../../translations';
import { Field, Form, FormDataProvider, getUseField, UseField, useForm } from '../shared_imports';
import { AddItem } from '../add_item_form';
import { defaultRiskScoreBySeverity, severityOptions, SeverityValue } from './data';
import { stepAboutDefaultValue } from './default_value';
import { schema } from './schema';
import * as I18n from './translations';
import { StepRuleDescription } from '../description_step';
import { AddMitreThreat } from '../mitre';

const CommonUseField = getUseField({ component: Field });

interface StepAboutRuleProps extends RuleStepProps {
  defaultValues?: AboutStepRule | null;
}

export const StepAboutRule = memo<StepAboutRuleProps>(
  ({
    defaultValues,
    descriptionDirection = 'row',
    isReadOnlyView,
    isUpdateView = false,
    isLoading,
    setForm,
    setStepData,
  }) => {
    const [myStepData, setMyStepData] = useState<AboutStepRule>(stepAboutDefaultValue);

    const { form } = useForm({
      defaultValue: myStepData,
      options: { stripEmptyFields: false },
      schema,
    });

    const onSubmit = useCallback(async () => {
      if (setStepData) {
        setStepData(RuleStep.aboutRule, null, false);
        const { isValid, data } = await form.submit();
        if (isValid) {
          setStepData(RuleStep.aboutRule, data, isValid);
          setMyStepData({ ...data, isNew: false } as AboutStepRule);
        }
      }
    }, [form]);

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
        setForm(RuleStep.aboutRule, form);
      }
    }, [form]);

    return isReadOnlyView && myStepData != null ? (
      <StepRuleDescription data={myStepData} direction={descriptionDirection} schema={schema} />
    ) : (
      <>
        <Form data-test-subj="stepAboutRule" form={form}>
          <CommonUseField
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleName',
              'data-test-subj': 'detectionEngineStepAboutRuleName',
              euiFieldProps: {
                compressed: true,
                fullWidth: false,
                disabled: isLoading,
              },
            }}
            path="name"
          />
          <CommonUseField
            componentProps={{
              compressed: true,
              idAria: 'detectionEngineStepAboutRuleDescription',
              'data-test-subj': 'detectionEngineStepAboutRuleDescription',
              euiFieldProps: {
                compressed: true,
                disabled: isLoading,
              },
            }}
            path="description"
          />
          <CommonUseField
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleSeverity',
              'data-test-subj': 'detectionEngineStepAboutRuleSeverity',
              euiFieldProps: {
                compressed: true,
                fullWidth: false,
                disabled: isLoading,
                options: severityOptions,
              },
            }}
            path="severity"
          />
          <CommonUseField
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleRiskScore',
              'data-test-subj': 'detectionEngineStepAboutRuleRiskScore',
              euiFieldProps: {
                max: 100,
                min: 0,
                compressed: true,
                fullWidth: false,
                disabled: isLoading,
                options: severityOptions,
              },
            }}
            path="riskScore"
          />
          <UseField
            component={AddItem}
            componentProps={{
              compressed: true,
              addText: I18n.ADD_REFERENCE,
              idAria: 'detectionEngineStepAboutRuleReferenceUrls',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepAboutRuleReferenceUrls',
            }}
            path="references"
          />
          <UseField
            component={AddItem}
            componentProps={{
              compressed: true,
              addText: I18n.ADD_FALSE_POSITIVE,
              idAria: 'detectionEngineStepAboutRuleFalsePositives',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepAboutRuleFalsePositives',
            }}
            path="falsePositives"
          />
          <UseField
            component={AddMitreThreat}
            componentProps={{
              compressed: true,
              idAria: 'detectionEngineStepAboutRuleMitreThreats',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepAboutRuleMitreThreats',
            }}
            path="threats"
          />
          <CommonUseField
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleTags',
              'data-test-subj': 'detectionEngineStepAboutRuleTags',
              euiFieldProps: {
                compressed: true,
                fullWidth: true,
                isDisabled: isLoading,
              },
            }}
            path="tags"
          />
          <FormDataProvider pathsToWatch="severity">
            {({ severity }) => {
              const newRiskScore = defaultRiskScoreBySeverity[severity as SeverityValue];
              const riskScoreField = form.getFields().riskScore;
              if (newRiskScore != null && riskScoreField.value !== newRiskScore) {
                riskScoreField.setValue(newRiskScore);
              }
              return null;
            }}
          </FormDataProvider>
        </Form>
        {!isUpdateView && (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiFlexGroup
              alignItems="center"
              gutterSize="xs"
              justifyContent="flexEnd"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiButton isDisabled={isLoading} fill onClick={onSubmit}>
                  {myStepData.isNew ? RuleI18n.CONTINUE : RuleI18n.UPDATE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </>
    );
  }
);
