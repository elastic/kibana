/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiStepStatus } from '@elastic/eui';
import { EuiStepsHorizontal } from '@elastic/eui';
import { ESQL_WIZARD_STEPS } from './esql_wizard_steps';

interface Props {
  currentStep: ESQL_WIZARD_STEPS;
  highestStep: ESQL_WIZARD_STEPS;
  setCurrentStep: (step: ESQL_WIZARD_STEPS) => void;
}

/**
 * Progress bar for the staged ES|QL wizard (LEAD DECISION 2026-09-29,
 * g2sz.10 pass 2: shell option (b) — a thin ES|QL-only stepper, not an
 * extension of the shared `WizardHorizontalSteps`/`WIZARD_STEPS`). Jumping
 * back is allowed to any step at or below `highestStep`, mirroring the
 * classic wizards' horizontal steps component.
 */
export const EsqlWizardHorizontalSteps: FC<Props> = ({
  currentStep,
  highestStep,
  setCurrentStep,
}) => {
  const jumpToStep = (step: ESQL_WIZARD_STEPS) => {
    if (step <= highestStep) {
      setCurrentStep(step);
    }
  };

  const createStepProps = (step: ESQL_WIZARD_STEPS) => ({
    onClick: () => jumpToStep(step),
    status: (currentStep === step
      ? 'selected'
      : currentStep > step
      ? 'complete'
      : 'incomplete') as EuiStepStatus,
    disabled: highestStep < step,
  });

  const stepsConfig = [
    {
      title: i18n.translate('xpack.ml.esqlJob.wizard.step.queryTimeRangeTitle', {
        defaultMessage: 'Query and time range',
      }),
      ...createStepProps(ESQL_WIZARD_STEPS.QUERY_TIME_RANGE),
      'data-test-subj': 'mlEsqlWizardQueryTimeRangeStep',
    },
    {
      title: i18n.translate('xpack.ml.esqlJob.wizard.step.pickFieldsTitle', {
        defaultMessage: 'Choose fields',
      }),
      ...createStepProps(ESQL_WIZARD_STEPS.PICK_FIELDS),
      'data-test-subj': 'mlEsqlWizardPickFieldsStep',
    },
    {
      title: i18n.translate('xpack.ml.esqlJob.wizard.step.jobDetailsTitle', {
        defaultMessage: 'Job details',
      }),
      ...createStepProps(ESQL_WIZARD_STEPS.JOB_DETAILS),
      'data-test-subj': 'mlEsqlWizardJobDetailsStep',
    },
    {
      title: i18n.translate('xpack.ml.esqlJob.wizard.step.summaryTitle', {
        defaultMessage: 'Summary',
      }),
      ...createStepProps(ESQL_WIZARD_STEPS.SUMMARY),
      'data-test-subj': 'mlEsqlWizardSummaryStep',
    },
  ];

  return <EuiStepsHorizontal steps={stepsConfig} style={{ backgroundColor: 'inherit' }} />;
};
