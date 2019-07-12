/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState, useEffect } from 'react';
import { EuiButton, EuiHorizontalRule } from '@elastic/eui';
import { WizardNav } from '../../../../../data_frame/components/wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { KibanaContext, isKibanaContext } from '../../../../../data_frame/common/kibana_context';
import { mlJobService } from '../../../../../services/job_service';

export const SummaryStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const { jobCreator } = useContext(JobCreatorContext);
  const [progress, setProgress] = useState(0);

  function setProgressWrapper(p: number) {
    setProgress(p);
  }

  useEffect(() => {
    jobCreator.subscribeToProgress(setProgressWrapper);
  }, []);

  function start() {
    jobCreator.createAndStartJob();
  }

  function viewResults() {
    const url = mlJobService.createResultsUrl(
      [jobCreator.jobId],
      jobCreator.start,
      jobCreator.end,
      'timeseriesexplorer'
    );
    window.open(url, '_blank');
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <Fragment>
            {jobCreator.jobId}
            <br />
            {jobCreator.start} : {jobCreator.end}
            <br />
            {JSON.stringify(jobCreator.detectors, null, 2)}
            <br />
            {jobCreator.bucketSpan}
          </Fragment>
          {progress === 0 && (
            <WizardNav previous={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)} />
          )}
          <EuiHorizontalRule />
          {progress < 100 && (
            <EuiButton onClick={start} isDisabled={progress > 0}>
              Create job
            </EuiButton>
          )}
          {progress === 100 && (
            <Fragment>
              <EuiButton onClick={viewResults}>View results</EuiButton>
            </Fragment>
          )}
        </Fragment>
      )}
      {isCurrentStep === false && (
        <Fragment>
          {jobCreator.jobId}
          <br />
          {jobCreator.start} : {jobCreator.end}
          <br />
          {JSON.stringify(jobCreator.detectors, null, 2)}
          <br />
          {jobCreator.bucketSpan}
        </Fragment>
      )}
    </Fragment>
  );
};
