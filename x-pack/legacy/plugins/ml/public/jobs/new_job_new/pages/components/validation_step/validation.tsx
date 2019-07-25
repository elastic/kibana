/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState } from 'react';
import { WizardNav } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { mlJobService } from '../../../../../services/job_service';
import { ValidateJob } from '../../../../../components/validate_job/validate_job_view';

const idFilterList = [
  'job_id_valid',
  'job_group_id_valid',
  'detectors_function_not_empty',
  'success_bucket_span',
];

export const ValidationStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobCreator, jobValidator } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);

  function getJobConfig() {
    return {
      ...jobCreator.jobConfig,
      datafeed_config: jobCreator.datafeedConfig,
    };
  }

  function getDuration() {
    return {
      start: jobCreator.start,
      end: jobCreator.end,
    };
  }

  // keep a record of the advanced validation in the jobValidator
  // and disable the next button if any advanced checks have failed.
  // note, it is not currently possible to get to a state where any of the
  // advanced validation checks return an error because they are all
  // caught in previous basic checks
  function setIsValid(valid: boolean) {
    jobValidator.advancedValid = valid;
    setNextActive(valid);
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <ValidateJob
            getJobConfig={getJobConfig}
            getDuration={getDuration}
            mlJobService={mlJobService}
            embedded={true}
            setIsValid={setIsValid}
            idFilterList={idFilterList}
          />
          <WizardNav
            previous={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)}
            next={() => setCurrentStep(WIZARD_STEPS.SUMMARY)}
            nextActive={nextActive}
          />
        </Fragment>
      )}
      {isCurrentStep === false && <Fragment></Fragment>}
    </Fragment>
  );
};
