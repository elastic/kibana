/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';

import { JobCreatorContext } from '../job_creator_context';
import { WizardNav } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JOB_TYPE } from '../../../common/job_creator/util/constants';
import { SingleMetricView } from './components/single_metric_view';
import { MultiMetricView } from './components/multi_metric_view';
import { PopulationView } from './components/population_view';
import { AdvancedView } from './components/advanced_view';
import { JsonEditorFlyout } from '../summary_step/components/json_editor_flyout';

export const PickFieldsStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobCreator, jobCreatorUpdated, jobValidator, jobValidatorUpdated } = useContext(
    JobCreatorContext
  );
  const [nextActive, setNextActive] = useState(false);
  const [jobType, setJobType] = useState(jobCreator.type);

  useEffect(() => {
    // this shouldn't really change, but just in case we need to...
    setJobType(jobCreator.type);
  }, [jobCreatorUpdated]);

  useEffect(() => {
    const active =
      jobCreator.detectors.length > 0 &&
      (jobCreator.type !== JOB_TYPE.ADVANCED ||
        (jobCreator.type === JOB_TYPE.ADVANCED && jobValidator.modelMemoryLimit.valid)) &&
      jobValidator.bucketSpan.valid &&
      jobValidator.duplicateDetectors.valid &&
      jobValidator.validating === false;
    setNextActive(active);
  }, [jobValidatorUpdated]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          {jobType === JOB_TYPE.SINGLE_METRIC && (
            <SingleMetricView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          {jobType === JOB_TYPE.MULTI_METRIC && (
            <MultiMetricView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          {jobType === JOB_TYPE.POPULATION && (
            <PopulationView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          {jobType === JOB_TYPE.ADVANCED && (
            <AdvancedView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          <WizardNav
            previous={() =>
              setCurrentStep(
                jobCreator.type === JOB_TYPE.ADVANCED
                  ? WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED
                  : WIZARD_STEPS.TIME_RANGE
              )
            }
            next={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)}
            nextActive={nextActive}
          >
            {jobType === JOB_TYPE.ADVANCED && (
              <JsonEditorFlyout isDisabled={false} jobCreator={jobCreator} />
            )}
          </WizardNav>
        </Fragment>
      )}
    </Fragment>
  );
};
