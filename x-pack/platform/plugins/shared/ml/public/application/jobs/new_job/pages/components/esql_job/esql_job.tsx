/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MlAppHeader, useAnomalyDetectionJobsBack } from '../../../../../components/ml_app_header';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';
import { ESQL_WIZARD_STEPS } from './esql_wizard_steps';
import { EsqlWizardHorizontalSteps } from './esql_wizard_horizontal_steps';
import { WizardNav } from '../wizard_nav';
import { computeEsqlStepGating } from './esql_step_gating';
import { EsqlQueryTimeRangeStep } from './esql_query_time_range_step';
import { EsqlPickFieldsStep } from './esql_pick_fields_step';
import { EsqlJobDetailsStep } from './esql_job_details_step';
import { EsqlSummaryStep } from './esql_summary_step';
import { useEsqlColumnsResolver } from './esql_columns_resolver';
import { useEsqlHistogramExecutor } from './esql_histogram_executor';

const stepComponents: Record<ESQL_WIZARD_STEPS, FC> = {
  [ESQL_WIZARD_STEPS.QUERY_TIME_RANGE]: EsqlQueryTimeRangeStep,
  [ESQL_WIZARD_STEPS.PICK_FIELDS]: EsqlPickFieldsStep,
  [ESQL_WIZARD_STEPS.JOB_DETAILS]: EsqlJobDetailsStep,
  [ESQL_WIZARD_STEPS.SUMMARY]: EsqlSummaryStep,
};

/**
 * The staged ES|QL wizard (LEAD DECISION 2026-09-29, g2sz.10): a thin,
 * ES|QL-only stepper (shell option (b) from pass 2) — its own step enum +
 * `WizardNav` + `EuiStepsHorizontal`, rather than extending the shared
 * `WIZARD_STEPS` used by the classic DataView-backed wizards.
 */
export const EsqlWizard = () => {
  const { state, refreshTimeRange } = useEsqlWizardContext();
  useEsqlColumnsResolver();
  useEsqlHistogramExecutor();

  const [currentStep, setCurrentStep] = useState(ESQL_WIZARD_STEPS.QUERY_TIME_RANGE);
  const [highestStep, setHighestStep] = useState(ESQL_WIZARD_STEPS.QUERY_TIME_RANGE);

  const gating = computeEsqlStepGating(state);
  const isLastStep = currentStep === ESQL_WIZARD_STEPS.SUMMARY;
  const nextActive = !isLastStep && gating[currentStep];

  const goToStep = (step: ESQL_WIZARD_STEPS) => {
    // Relative times ('now-15m') are resolved when the range is used; returning
    // to step 1 re-resolves them against the current clock (g2sz.28).
    if (step === ESQL_WIZARD_STEPS.QUERY_TIME_RANGE && currentStep !== step) refreshTimeRange();
    setCurrentStep(step);
    setHighestStep((current) => Math.max(current, step) as ESQL_WIZARD_STEPS);
  };

  const next = () => {
    if (!nextActive) return;

    goToStep((currentStep + 1) as ESQL_WIZARD_STEPS);
  };

  const previous = () => {
    if (currentStep === ESQL_WIZARD_STEPS.QUERY_TIME_RANGE) return;

    const previousStep = (currentStep - 1) as ESQL_WIZARD_STEPS;

    if (previousStep === ESQL_WIZARD_STEPS.QUERY_TIME_RANGE) refreshTimeRange();
    setCurrentStep(previousStep);
  };

  const StepComponent = stepComponents[currentStep];

  return (
    <>
      <EsqlWizardHorizontalSteps
        currentStep={currentStep}
        highestStep={highestStep}
        setCurrentStep={goToStep}
      />
      <EuiSpacer size="l" />
      <StepComponent />
      <WizardNav
        previous={currentStep === ESQL_WIZARD_STEPS.QUERY_TIME_RANGE ? undefined : previous}
        next={isLastStep ? undefined : next}
        nextActive={nextActive}
      />
    </>
  );
};

export const Page: FC = () => {
  const anomalyDetectionJobsBack = useAnomalyDetectionJobsBack();

  return (
    <div data-test-subj="mlPageEsqlJob">
      <MlAppHeader
        title={i18n.translate('xpack.ml.esqlJob.pageTitle', {
          defaultMessage: 'ES|QL',
        })}
        back={anomalyDetectionJobsBack}
      />
      <EsqlWizardProvider>
        <EsqlWizard />
      </EsqlWizardProvider>
    </div>
  );
};
