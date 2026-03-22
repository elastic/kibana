/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiPage,
  EuiPageHeader,
  EuiPageSection,
  EuiSteps,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRouteMatch, useHistory } from 'react-router-dom';

import { RuleBasicInfoStep } from '../components/rule_authoring/rule_basic_info_step';
import { RuleQueryBuilderStep } from '../components/rule_authoring/rule_query_builder_step';
import { RuleEvaluationStep } from '../components/rule_authoring/rule_evaluation_step';
import { RuleTestingStep } from '../components/rule_authoring/rule_testing_step';
import { RuleReviewStep } from '../components/rule_authoring/rule_review_step';
import { useComplianceApi } from '../hooks/use_compliance_api';
import type { ComplianceRuleMetadata } from '../../../common/compliance/types';

interface RuleAuthoringFormData {
  // Basic Information
  name: string;
  description: string;
  remediation: string;
  benchmark: {
    id: string;
    name: string;
    version: string;
  };
  section: string;
  level: 1 | 2;
  platform: 'darwin' | 'windows' | 'linux';
  tags: string[];
  frameworks: Array<{
    id: string;
    version: string;
    control: string;
  }>;

  // Query Configuration
  osquery_query: string;
  interval: number;
  snapshot: boolean;
  
  // Evaluation Logic
  evaluation_logic: 'count_based' | 'value_based' | 'custom';
  expected_result_type: 'rows_returned' | 'no_rows' | 'specific_value';
  expected_value?: string | number;
  custom_evaluation?: string;

  // Testing Results
  test_results?: {
    status: 'passed' | 'failed' | 'error';
    message: string;
    execution_time?: number;
    result_count?: number;
    sample_results?: any[];
  };
}

const INITIAL_FORM_DATA: RuleAuthoringFormData = {
  name: '',
  description: '',
  remediation: '',
  benchmark: {
    id: '',
    name: '',
    version: '',
  },
  section: '',
  level: 1,
  platform: 'linux',
  tags: [],
  frameworks: [],
  osquery_query: '',
  interval: 300,
  snapshot: false,
  evaluation_logic: 'count_based',
  expected_result_type: 'rows_returned',
};

const STEP_TITLES = [
  'Basic Information',
  'Query Builder',
  'Evaluation Logic',
  'Testing & Validation',
  'Review & Create',
];

export const RuleAuthoringPage: React.FC = () => {
  const history = useHistory();
  const routeMatch = useRouteMatch<{ ruleId?: string }>();
  const isEditing = !!routeMatch.params.ruleId;

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<RuleAuthoringFormData>(INITIAL_FORM_DATA);
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { createRule, updateRule, testRule } = useComplianceApi();

  // Load existing rule data if editing
  React.useEffect(() => {
    if (isEditing && routeMatch.params.ruleId) {
      // TODO: Load existing rule data
      // const rule = await getRule(routeMatch.params.ruleId);
      // setFormData(convertRuleToFormData(rule));
    }
  }, [isEditing, routeMatch.params.ruleId]);

  const updateFormData = useCallback((updates: Partial<RuleAuthoringFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setSaveError(null);
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 0: // Basic Information
        return !!(
          formData.name &&
          formData.description &&
          formData.benchmark.id &&
          formData.section &&
          formData.platform
        );
      
      case 1: // Query Builder
        return !!(
          formData.osquery_query &&
          formData.osquery_query.trim().toLowerCase().includes('select') &&
          formData.interval > 0
        );
      
      case 2: // Evaluation Logic
        return !!(
          formData.evaluation_logic &&
          formData.expected_result_type &&
          (formData.evaluation_logic !== 'value_based' || formData.expected_value !== undefined)
        );
      
      case 3: // Testing
        return !!(
          formData.test_results &&
          formData.test_results.status === 'passed'
        );
      
      case 4: // Review
        return Object.values(stepValidation).slice(0, 4).every(Boolean);
      
      default:
        return false;
    }
  }, [currentStep, formData, stepValidation]);

  const canProceedToNextStep = useMemo(() => {
    return validateCurrentStep();
  }, [validateCurrentStep]);

  const handleStepChange = useCallback((stepIndex: number) => {
    const currentStepValid = validateCurrentStep();
    setStepValidation(prev => ({ ...prev, [currentStep]: currentStepValid }));
    
    if (stepIndex > currentStep && !currentStepValid) {
      return; // Don't allow proceeding with invalid step
    }
    
    setCurrentStep(stepIndex);
  }, [currentStep, validateCurrentStep]);

  const handleNext = useCallback(() => {
    const currentStepValid = validateCurrentStep();
    setStepValidation(prev => ({ ...prev, [currentStep]: currentStepValid }));
    
    if (currentStepValid && currentStep < STEP_TITLES.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateCurrentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleTestQuery = useCallback(async () => {
    if (!formData.osquery_query) return;

    try {
      const testResult = await testRule.mutateAsync({
        query: formData.osquery_query,
        platform: formData.platform,
        evaluation_logic: formData.evaluation_logic,
        expected_result_type: formData.expected_result_type,
        expected_value: formData.expected_value,
      });

      updateFormData({ test_results: testResult });
    } catch (error) {
      updateFormData({
        test_results: {
          status: 'error',
          message: error.message || 'Test execution failed',
        },
      });
    }
  }, [formData, testRule, updateFormData]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const ruleData: Partial<ComplianceRuleMetadata> = {
        name: formData.name,
        description: formData.description,
        remediation: formData.remediation,
        benchmark: formData.benchmark,
        section: formData.section,
        level: formData.level,
        platform: formData.platform,
        tags: formData.tags,
        frameworks: formData.frameworks,
        osquery_query: formData.osquery_query,
        interval: formData.interval,
        enabled: true,
        prebuilt: false,
      };

      if (isEditing && routeMatch.params.ruleId) {
        await updateRule.mutateAsync({
          id: routeMatch.params.ruleId,
          rule: ruleData,
        });
      } else {
        await createRule.mutateAsync(ruleData);
      }

      // Navigate back to rules management
      history.push('/compliance/rules');
    } catch (error) {
      setSaveError(error.message || 'Failed to save rule');
    } finally {
      setIsSaving(false);
    }
  }, [formData, isEditing, routeMatch.params.ruleId, createRule, updateRule, history]);

  const handleCancel = useCallback(() => {
    history.push('/compliance/rules');
  }, [history]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <RuleBasicInfoStep
            formData={formData}
            updateFormData={updateFormData}
            isValid={stepValidation[0]}
          />
        );
      
      case 1:
        return (
          <RuleQueryBuilderStep
            formData={formData}
            updateFormData={updateFormData}
            isValid={stepValidation[1]}
          />
        );
      
      case 2:
        return (
          <RuleEvaluationStep
            formData={formData}
            updateFormData={updateFormData}
            isValid={stepValidation[2]}
          />
        );
      
      case 3:
        return (
          <RuleTestingStep
            formData={formData}
            updateFormData={updateFormData}
            onTestQuery={handleTestQuery}
            isValid={stepValidation[3]}
            isTesting={testRule.isLoading}
          />
        );
      
      case 4:
        return (
          <RuleReviewStep
            formData={formData}
            stepValidation={stepValidation}
            isValid={stepValidation[4]}
          />
        );
      
      default:
        return null;
    }
  };

  const steps = STEP_TITLES.map((title, index) => ({
    title,
    status: stepValidation[index] 
      ? 'complete' 
      : index === currentStep 
        ? 'current' 
        : index < currentStep 
          ? 'warning' 
          : 'incomplete',
    children: index === currentStep ? renderStepContent() : null,
    onClick: () => handleStepChange(index),
  }));

  return (
    <EuiPage paddingSize="l">
      <EuiPageSection>
        <EuiPageHeader
          pageTitle={
            <FormattedMessage
              id="xpack.osquery.compliance.ruleAuthoring.pageTitle"
              defaultMessage="{action} Compliance Rule"
              values={{ action: isEditing ? 'Edit' : 'Create' }}
            />
          }
          description={
            <FormattedMessage
              id="xpack.osquery.compliance.ruleAuthoring.pageDescription"
              defaultMessage="Build custom compliance rules with osquery queries to monitor your endpoints against organizational policies."
            />
          }
          breadcrumbs={[
            {
              text: 'Compliance',
              href: '/compliance',
            },
            {
              text: 'Rules',
              href: '/compliance/rules',
            },
            {
              text: isEditing ? 'Edit Rule' : 'Create Rule',
            },
          ]}
        />

        <EuiSpacer size="l" />

        {saveError && (
          <>
            <EuiCallOut
              title="Failed to save rule"
              color="danger"
              iconType="error"
            >
              <p>{saveError}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        <EuiSteps
          steps={steps}
          titleSize="s"
        />

        <EuiSpacer size="l" />

        <EuiHorizontalRule />

        <EuiSpacer size="m" />

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <FormattedMessage
                    id="xpack.osquery.compliance.ruleAuthoring.cancelButton"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>

              {currentStep > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={handlePrevious}
                    disabled={isSaving}
                  >
                    <FormattedMessage
                      id="xpack.osquery.compliance.ruleAuthoring.previousButton"
                      defaultMessage="Previous"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {currentStep < STEP_TITLES.length - 1 ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={handleNext}
                    disabled={!canProceedToNextStep || isSaving}
                  >
                    <FormattedMessage
                      id="xpack.osquery.compliance.ruleAuthoring.nextButton"
                      defaultMessage="Next"
                    />
                  </EuiButton>
                </EuiFlexItem>
              ) : (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="primary"
                    onClick={handleSave}
                    disabled={!canProceedToNextStep || isSaving}
                  >
                    {isSaving ? (
                      <EuiLoadingSpinner size="s" />
                    ) : (
                      <FormattedMessage
                        id="xpack.osquery.compliance.ruleAuthoring.saveButton"
                        defaultMessage="{action} Rule"
                        values={{ action: isEditing ? 'Update' : 'Create' }}
                      />
                    )}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    </EuiPage>
  );
};