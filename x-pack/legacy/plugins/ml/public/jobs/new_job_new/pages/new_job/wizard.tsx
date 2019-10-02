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

interface Props {
  jobCreator: JobCreatorType;
  chartLoader: ChartLoader;
  resultsLoader: ResultsLoader;
  chartInterval: TimeBuckets;
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

  return (
    <JobCreatorContext.Provider value={jobCreatorContext}>
      <WizardSteps
        currentStep={currentStep}
        highestStep={highestStep}
        setCurrentStep={setCurrentStep}
        disableSteps={disableSteps}
        jobType={jobCreator.type}
      />
    </JobCreatorContext.Provider>
  );
};

function stringifyConfigs(jobConfig: object, datafeedConfig: object) {
  return JSON.stringify(jobConfig) + JSON.stringify(datafeedConfig);
}
