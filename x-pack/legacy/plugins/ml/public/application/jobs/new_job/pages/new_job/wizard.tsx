/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useReducer, useState, useEffect } from 'react';

import { WIZARD_STEPS } from '../components/step_types';

import { TimeBuckets } from '../../../../util/time_buckets';

import { JobCreatorContext, JobCreatorContextValue } from '../components/job_creator_context';
import { ExistingJobsAndGroups } from '../../../../services/job_service';

import { JobCreatorType } from '../../common/job_creator';
import { ChartLoader } from '../../common/chart_loader';
import { ResultsLoader } from '../../common/results_loader';
import { JobValidator } from '../../common/job_validator';
import { newJobCapsService } from '../../../../services/new_job_capabilities_service';
import { WizardSteps } from './wizard_steps';
import { WizardHorizontalSteps } from './wizard_horizontal_steps';
import { JOB_TYPE } from '../../../../../../common/constants/new_job';

interface Props {
  jobCreator: JobCreatorType;
  chartLoader: ChartLoader;
  resultsLoader: ResultsLoader;
  chartInterval: TimeBuckets;
  jobValidator: JobValidator;
  existingJobsAndGroups: ExistingJobsAndGroups;
  firstWizardStep: WIZARD_STEPS;
}

export const Wizard: FC<Props> = ({
  jobCreator,
  chartLoader,
  resultsLoader,
  chartInterval,
  jobValidator,
  existingJobsAndGroups,
  firstWizardStep = WIZARD_STEPS.TIME_RANGE,
}) => {
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

  const firstStep =
    jobCreator.type === JOB_TYPE.ADVANCED
      ? WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED
      : WIZARD_STEPS.TIME_RANGE;

  const [currentStep, setCurrentStep] = useState(firstStep);
  const [highestStep, setHighestStep] = useState(firstStep);
  const [disableSteps, setDisableSteps] = useState(false);
  const [progress, setProgress] = useState(resultsLoader.progress);
  const [stringifiedConfigs, setStringifiedConfigs] = useState(
    stringifyConfigs(jobCreator.jobConfig, jobCreator.datafeedConfig)
  );

  useEffect(() => {
    const subscription = jobValidator.validationResult$.subscribe(() => {
      setJobValidatorUpdate(jobValidatorUpdated);
    });

    return () => {
      return subscription.unsubscribe();
    };
  }, []);

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

    setCurrentStep(firstWizardStep);
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

  return (
    <JobCreatorContext.Provider value={jobCreatorContext}>
      <WizardHorizontalSteps
        currentStep={currentStep}
        highestStep={highestStep}
        setCurrentStep={setCurrentStep}
        disableSteps={disableSteps}
        jobType={jobCreator.type}
      />
      <WizardSteps currentStep={currentStep} setCurrentStep={setCurrentStep} />
    </JobCreatorContext.Provider>
  );
};

function stringifyConfigs(jobConfig: object, datafeedConfig: object) {
  return JSON.stringify(jobConfig) + JSON.stringify(datafeedConfig);
}
