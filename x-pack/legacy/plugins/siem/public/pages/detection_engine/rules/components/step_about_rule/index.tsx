/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiHorizontalRule, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { FC, memo, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { setFieldValue } from '../../helpers';
import { RuleStepProps, RuleStep, AboutStepRule } from '../../types';
import * as RuleI18n from '../../translations';
import { AddItem } from '../add_item_form';
import { StepRuleDescription } from '../description_step';
import { AddMitreThreat } from '../mitre';
import { Field, Form, FormDataProvider, getUseField, UseField, useForm } from '../shared_imports';

import { defaultRiskScoreBySeverity, severityOptions, SeverityValue } from './data';
import { stepAboutDefaultValue } from './default_value';
import { isUrlInvalid } from './helpers';
import { schema } from './schema';
import * as I18n from './translations';
import { PickTimeline } from '../pick_timeline';
import { StepContentWrapper } from '../step_content_wrapper';

const CommonUseField = getUseField({ component: Field });

interface StepAboutRuleProps extends RuleStepProps {
  defaultValues?: AboutStepRule | null;
}

const TagContainer = styled.div`
  margin-top: 16px;
`;

const StepAboutRuleComponent: FC<StepAboutRuleProps> = ({
  addPadding = false,
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
      setFieldValue(form, schema, myDefaultValues);
    }
  }, [defaultValues]);

  useEffect(() => {
    if (setForm != null) {
      setForm(RuleStep.aboutRule, form);
    }
  }, [form]);

  return isReadOnlyView && myStepData.name != null ? (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription direction={descriptionDirection} schema={schema} data={myStepData} />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepAboutRule">
          <CommonUseField
            path="name"
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleName',
              'data-test-subj': 'detectionEngineStepAboutRuleName',
              euiFieldProps: {
                fullWidth: false,
                disabled: isLoading,
              },
            }}
          />
          <CommonUseField
            path="description"
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleDescription',
              'data-test-subj': 'detectionEngineStepAboutRuleDescription',
              euiFieldProps: {
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
                fullWidth: false,
                disabled: isLoading,
                options: severityOptions,
                showTicks: true,
                tickInterval: 25,
              },
            }}
          />
          <UseField
            path="timeline"
            component={PickTimeline}
            componentProps={{
              idAria: 'detectionEngineStepAboutRuleTimeline',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepAboutRuleTimeline',
            }}
          />
          <UseField
            path="references"
            component={AddItem}
            componentProps={{
              addText: I18n.ADD_REFERENCE,
              idAria: 'detectionEngineStepAboutRuleReferenceUrls',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepAboutRuleReferenceUrls',
              validate: isUrlInvalid,
            }}
          />
          <UseField
            path="falsePositives"
            component={AddItem}
            componentProps={{
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
              idAria: 'detectionEngineStepAboutRuleMitreThreats',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepAboutRuleMitreThreats',
            }}
          />
          <TagContainer>
            <CommonUseField
              path="tags"
              componentProps={{
                idAria: 'detectionEngineStepAboutRuleTags',
                'data-test-subj': 'detectionEngineStepAboutRuleTags',
                euiFieldProps: {
                  fullWidth: true,
                  isDisabled: isLoading,
                  placeholder: '',
                },
              }}
            />
          </TagContainer>
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
              <EuiButton fill onClick={onSubmit} isDisabled={isLoading}>
                {RuleI18n.CONTINUE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

export const StepAboutRule = memo(StepAboutRuleComponent);
