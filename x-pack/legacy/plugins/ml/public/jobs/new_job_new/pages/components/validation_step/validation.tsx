/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState, useEffect } from 'react';
// import { EuiButton, EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';
import { WizardNav } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { KibanaContext, isKibanaContext } from '../../../../../data_frame/common/kibana_context';
import { mlJobService } from '../../../../../services/job_service';
// import { isSingleMetricJobCreator } from '../../../common/job_creator';
import { ValidateJob } from '../../../../../components/validate_job/validate_job_view';

export const ValidationStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const { jobCreator, jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);
  // const [isValid, setIsValid] = useState(jobValidator.validationSummary.basic);

  useEffect(() => {
    const active =
      jobCreator.detectors.length > 0 &&
      jobValidator.bucketSpan.valid &&
      jobValidator.duplicateDetectors.valid;
    setNextActive(active);
  }, [jobValidatorUpdated]);

  function getJobConfig() {
    return {
      ...jobCreator.jobConfig,
      datafeed_config: jobCreator.datafeedConfig,
    };
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <ValidateJob getJobConfig={getJobConfig} mlJobService={mlJobService} embedded={true} />
          {/* <Fragment>Validation</Fragment> */}
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
