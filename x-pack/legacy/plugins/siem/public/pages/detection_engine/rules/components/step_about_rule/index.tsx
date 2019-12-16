/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiHorizontalRule, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual, get } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { RuleStepProps, RuleStep, AboutStepRule, AboutStepRuleJson } from '../../types';
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
  defaultValues?: AboutStepRuleJson | null;
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
          riskScore: defaultValues.risk_score,
          falsePositives: defaultValues.false_positives,
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
      <StepRuleDescription direction={descriptionDirection} schema={schema} data={myStepData} />
    ) : (
      <>
        <Form form={form} data-test-subj="stepAboutRule">
          <CommonUseField
            path="name"
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleName',
              'data-test-subj': 'detectionEngineStepAboutRuleName',
              euiFieldProps: {
                compressed: true,
                fullWidth: false,
                disabled: isLoading,
              },
            }}
          />
          <CommonUseField
            path="description"
            componentProps={{
              compressed: true,
              idAria: 'detectionEngineStepAboutRuleDescription',
              'data-test-subj': 'detectionEngineStepAboutRuleDescription',
              euiFieldProps: {
                compressed: true,
                disabled: isLoading,
              },
            }}
          />
          <CommonUseField
            path="severity"
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
          />
          <CommonUseField
            path="riskScore"
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
          />
          <UseField
            path="references"
            component={AddItem}
            componentProps={{
              compressed: true,
              addText: I18n.ADD_REFERENCE,
              idAria: 'detectionEngineStepAboutRuleReferenceUrls',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepAboutRuleReferenceUrls',
            }}
          />
          <UseField
            path="falsePositives"
            component={AddItem}
            componentProps={{
              compressed: true,
              addText: I18n.ADD_FALSE_POSITIVE,
              idAria: 'detectionEngineStepAboutRuleFalsePositives',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepAboutRuleFalsePositives',
            }}
          />
          <UseField
            path="threats"
            component={AddMitreThreat}
            componentProps={{
              compressed: true,
              idAria: 'detectionEngineStepAboutRuleMitreThreats',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepAboutRuleMitreThreats',
            }}
          />
          <CommonUseField
            path="tags"
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleTags',
              'data-test-subj': 'detectionEngineStepAboutRuleTags',
              euiFieldProps: {
                compressed: true,
                fullWidth: true,
                isDisabled: isLoading,
              },
            }}
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
              justifyContent="flexEnd"
              gutterSize="xs"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={onSubmit} isDisabled={isLoading}>
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
