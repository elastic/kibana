/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { FC, memo, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { setFieldValue } from '../../helpers';
import { RuleStepProps, RuleStep, AboutStepRule } from '../../types';
import * as RuleI18n from '../../translations';
import { AddItem } from '../add_item_form';
import { StepRuleDescription } from '../description_step';
import { AddMitreThreat } from '../mitre';
import {
  Field,
  Form,
  FormDataProvider,
  getUseField,
  UseField,
  useForm,
} from '../../../../shared_imports';

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

TagContainer.displayName = 'TagContainer';

const AdvancedSettingsAccordion = styled(EuiAccordion)`
  .euiAccordion__iconWrapper {
    display: none;
  }

  .euiAccordion__childWrapper {
    transition-duration: 1ms; /* hack to fire Step accordion to set proper content's height */
  }

  &.euiAccordion-isOpen .euiButtonEmpty__content > svg {
    transform: rotate(90deg);
  }
`;

const AdvancedSettingsAccordionButton = (
  <EuiButtonEmpty flush="left" size="s" iconType="arrowRight">
    {I18n.ADVANCED_SETTINGS}
  </EuiButtonEmpty>
);

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
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
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
            </EuiFlexItem>
            <EuiFlexItem>
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
                    showTicks: true,
                    tickInterval: 25,
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
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
          <EuiSpacer size="m" />
          <AdvancedSettingsAccordion
            id="advancedSettingsAccordion"
            buttonContent={AdvancedSettingsAccordionButton}
          >
            <EuiSpacer size="m" />
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
              path="threat"
              component={AddMitreThreat}
              componentProps={{
                idAria: 'detectionEngineStepAboutRuleMitreThreat',
                isDisabled: isLoading,
                dataTestSubj: 'detectionEngineStepAboutRuleMitreThreat',
              }}
            />
          </AdvancedSettingsAccordion>
          <FormDataProvider pathsToWatch="severity">
            {({ severity }) => {
              const newRiskScore = defaultRiskScoreBySeverity[severity as SeverityValue];
              const severityField = form.getFields().severity;
              const riskScoreField = form.getFields().riskScore;
              if (
                severityField.value !== severity &&
                newRiskScore != null &&
                riskScoreField.value !== newRiskScore
              ) {
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
