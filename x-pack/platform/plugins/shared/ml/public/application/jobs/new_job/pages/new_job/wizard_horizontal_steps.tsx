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
import { WIZARD_STEPS } from '../components/step_types';
import { JOB_TYPE } from '../../../../../../common/constants/new_job';

interface Props {
  currentStep: WIZARD_STEPS;
  highestStep: WIZARD_STEPS;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
  disableSteps: boolean;
  jobType: JOB_TYPE;
}

export const WizardHorizontalSteps: FC<Props> = ({
  currentStep,
  highestStep,
  setCurrentStep,
  disableSteps,
  jobType,
}) => {
  function jumpToStep(step: WIZARD_STEPS) {
    if (step <= highestStep) {
      setCurrentStep(step);
    }
  }

  const stepsConfig = [
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.timeRangeTitle', {
        defaultMessage: 'Time range',
      }),
      ...createStepProps(WIZARD_STEPS.TIME_RANGE),
      'data-test-subj': 'mlJobWizardTimeRangeStep',
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.pickFieldsTitle', {
        defaultMessage: 'Choose fields',
      }),
      ...createStepProps(WIZARD_STEPS.PICK_FIELDS),
      'data-test-subj': 'mlJobWizardPickFieldsStep',
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.jobDetailsTitle', {
        defaultMessage: 'Job details',
      }),
      ...createStepProps(WIZARD_STEPS.JOB_DETAILS),
      'data-test-subj': 'mlJobWizardJobDetailsStep',
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.validationTitle', {
        defaultMessage: 'Validation',
      }),
      ...createStepProps(WIZARD_STEPS.VALIDATION),
      'data-test-subj': 'mlJobWizardValidationStep',
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.summaryTitle', {
        defaultMessage: 'Summary',
      }),
      ...createStepProps(WIZARD_STEPS.SUMMARY),
      'data-test-subj': 'mlJobWizardSummaryStep',
    },
  ];

  if (jobType === JOB_TYPE.ADVANCED) {
    stepsConfig.splice(0, 1, {
      title: i18n.translate('xpack.ml.newJob.wizard.step.configureDatafeedTitle', {
        defaultMessage: 'Configure datafeed',
      }),
      ...createStepProps(WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED),
      'data-test-subj': 'mlJobWizardAdvancedStep',
    });
  }

  function createStepProps(step: WIZARD_STEPS) {
    return {
      onClick: () => jumpToStep(step),
      status: (currentStep === step
        ? 'selected'
        : currentStep > step
        ? 'complete'
        : 'incomplete') as EuiStepStatus,
      disabled: disableSteps || highestStep < step,
    };
  }

  return <EuiStepsHorizontal steps={stepsConfig} style={{ backgroundColor: 'inherit' }} />;
};
