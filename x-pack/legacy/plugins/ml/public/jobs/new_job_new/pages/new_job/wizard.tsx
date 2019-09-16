/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useReducer, useState, useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiStepsHorizontal, EuiSpacer, EuiTitle } from '@elastic/eui';
import { WIZARD_STEPS } from '../components/step_types';

import { TimeRangeStep } from '../components/time_range_step';

import { PickFieldsStep } from '../components/pick_fields_step';
import { JobDetailsStep } from '../components/job_details_step';
import { ValidationStep } from '../components/validation_step';
import { SummaryStep } from '../components/summary_step';
import { MlTimeBuckets } from '../../../../util/ml_time_buckets';
import { useKibanaContext } from '../../../../contexts/kibana';

import { JobCreatorContext, JobCreatorContextValue } from '../components/job_creator_context';
import { ExistingJobsAndGroups } from '../../../../services/job_service';

import { JobCreatorType } from '../../common/job_creator';
import { ChartLoader } from '../../common/chart_loader';
import { ResultsLoader } from '../../common/results_loader';
import { JobValidator } from '../../common/job_validator';
import { newJobCapsService } from '../../../../services/new_job_capabilities_service';

interface Props {
  jobCreator: JobCreatorType;
  chartLoader: ChartLoader;
  resultsLoader: ResultsLoader;
  chartInterval: MlTimeBuckets;
  jobValidator: JobValidator;
  existingJobsAndGroups: ExistingJobsAndGroups;
  skipTimeRangeStep: boolean;
}

export const Wizard: FC<Props> = ({
  jobCreator,
  chartLoader,
  resultsLoader,
  chartInterval,
  jobValidator,
  existingJobsAndGroups,
  skipTimeRangeStep = false,
}) => {
  const kibanaContext = useKibanaContext();
  const [jobCreatorUpdated, setJobCreatorUpdate] = useReducer<(s: number) => number>(s => s + 1, 0);
  const jobCreatorUpdate = () => setJobCreatorUpdate(jobCreatorUpdated);

  const [jobValidatorUpdated, setJobValidatorUpdate] = useReducer<(s: number) => number>(
    s => s + 1,
    0
  );

  const jobCreatorContext: JobCreatorContextValue = {
    jobCreatorUpdated,
    jobCreatorUpdate,
    jobCreator,
    chartLoader,
    resultsLoader,
    chartInterval,
    jobValidator,
    jobValidatorUpdated,
    fields: newJobCapsService.fields,
    aggs: newJobCapsService.aggs,
    existingJobsAndGroups,
  };

  // store whether the advanced and additional sections have been expanded.
  // has to be stored at this level to ensure it's remembered on wizard step change
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [additionalExpanded, setAdditionalExpanded] = useState(false);

  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.TIME_RANGE);
  const [highestStep, setHighestStep] = useState(WIZARD_STEPS.TIME_RANGE);
  const [disableSteps, setDisableSteps] = useState(false);
  const [progress, setProgress] = useState(resultsLoader.progress);
  const [stringifiedConfigs, setStringifiedConfigs] = useState(
    stringifyConfigs(jobCreator.jobConfig, jobCreator.datafeedConfig)
  );

  useEffect(() => {
    jobValidator.validate(() => {
      setJobValidatorUpdate(jobValidatorUpdated);
    });

    // if the job config has changed, reset the highestStep
    // compare a stringified config to ensure the configs have actually changed
    const tempConfigs = stringifyConfigs(jobCreator.jobConfig, jobCreator.datafeedConfig);
    if (tempConfigs !== stringifiedConfigs) {
      setHighestStep(currentStep);
      setStringifiedConfigs(tempConfigs);
    }
  }, [jobCreatorUpdated]);

  useEffect(() => {
    jobCreator.subscribeToProgress(setProgress);

    if (skipTimeRangeStep) {
      setCurrentStep(WIZARD_STEPS.PICK_FIELDS);
    }
  }, []);

  // disable the step links if the job is running
  useEffect(() => {
    setDisableSteps(progress > 0);
  }, [progress]);

  // keep a record of the highest step reached in the wizard
  useEffect(() => {
    if (currentStep >= highestStep) {
      setHighestStep(currentStep);
    }
  }, [currentStep]);

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
      onClick: () => jumpToStep(WIZARD_STEPS.TIME_RANGE),
      isSelected: currentStep === WIZARD_STEPS.TIME_RANGE,
      isComplete: currentStep > WIZARD_STEPS.TIME_RANGE,
      disabled: disableSteps,
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.pickFieldsTitle', {
        defaultMessage: 'Pick fields',
      }),
      onClick: () => jumpToStep(WIZARD_STEPS.PICK_FIELDS),
      isSelected: currentStep === WIZARD_STEPS.PICK_FIELDS,
      isComplete: currentStep > WIZARD_STEPS.PICK_FIELDS,
      disabled: disableSteps,
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.jobDetailsTitle', {
        defaultMessage: 'Job details',
      }),
      onClick: () => jumpToStep(WIZARD_STEPS.JOB_DETAILS),
      isSelected: currentStep === WIZARD_STEPS.JOB_DETAILS,
      isComplete: currentStep > WIZARD_STEPS.JOB_DETAILS,
      disabled: disableSteps,
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.validationTitle', {
        defaultMessage: 'Validation',
      }),
      onClick: () => jumpToStep(WIZARD_STEPS.VALIDATION),
      isSelected: currentStep === WIZARD_STEPS.VALIDATION,
      isComplete: currentStep > WIZARD_STEPS.VALIDATION,
      disabled: disableSteps,
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.step.summaryTitle', {
        defaultMessage: 'Summary',
      }),
      onClick: () => jumpToStep(WIZARD_STEPS.SUMMARY),
      isSelected: currentStep === WIZARD_STEPS.SUMMARY,
      isComplete: currentStep > WIZARD_STEPS.SUMMARY,
      disabled: disableSteps,
    },
  ];

  function getSummaryStepTitle() {
    if (kibanaContext.currentSavedSearch.id !== undefined) {
      return i18n.translate('xpack.ml.newJob.wizard.stepComponentWrapper.summaryTitleSavedSearch', {
        defaultMessage: 'New job from saved search {title}',
        values: { title: kibanaContext.currentSavedSearch.title },
      });
    } else if (kibanaContext.currentIndexPattern.id !== undefined) {
      return i18n.translate(
        'xpack.ml.newJob.wizard.stepComponentWrapper.summaryTitleIndexPattern',
        {
          defaultMessage: 'New job from index pattern {title}',
          values: { title: kibanaContext.currentIndexPattern.title },
        }
      );
    }
    return '';
  }

  return (
    <JobCreatorContext.Provider value={jobCreatorContext}>
      <EuiStepsHorizontal steps={stepsConfig} style={{ backgroundColor: 'inherit' }} />

      {currentStep === WIZARD_STEPS.TIME_RANGE && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleTimeRange">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.timeRangeTitle"
              defaultMessage="Time range"
            />
          </Title>
          <TimeRangeStep
            isCurrentStep={currentStep === WIZARD_STEPS.TIME_RANGE}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.PICK_FIELDS && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitlePickFields">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.pickFieldsTitle"
              defaultMessage="Pick fields"
            />
          </Title>
          <PickFieldsStep
            isCurrentStep={currentStep === WIZARD_STEPS.PICK_FIELDS}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.JOB_DETAILS && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleJobDetails">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.jobDetailsTitle"
              defaultMessage="Job details"
            />
          </Title>
          <JobDetailsStep
            isCurrentStep={currentStep === WIZARD_STEPS.JOB_DETAILS}
            setCurrentStep={setCurrentStep}
            advancedExpanded={advancedExpanded}
            setAdvancedExpanded={setAdvancedExpanded}
            additionalExpanded={additionalExpanded}
            setAdditionalExpanded={setAdditionalExpanded}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.VALIDATION && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleValidation">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.validationTitle"
              defaultMessage="Validation"
            />
          </Title>
          <ValidationStep
            isCurrentStep={currentStep === WIZARD_STEPS.VALIDATION}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.SUMMARY && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleSummary">{getSummaryStepTitle()}</Title>
          <SummaryStep
            isCurrentStep={currentStep === WIZARD_STEPS.SUMMARY}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
    </JobCreatorContext.Provider>
  );
};

const Title: FC<{ 'data-test-subj': string }> = ({ 'data-test-subj': dataTestSubj, children }) => {
  return (
    <Fragment>
      <EuiTitle>
        <h2 data-test-subj={dataTestSubj}>{children}</h2>
      </EuiTitle>
      <EuiSpacer />
    </Fragment>
  );
};

function stringifyConfigs(jobConfig: object, datafeedConfig: object) {
  return JSON.stringify(jobConfig) + JSON.stringify(datafeedConfig);
}
