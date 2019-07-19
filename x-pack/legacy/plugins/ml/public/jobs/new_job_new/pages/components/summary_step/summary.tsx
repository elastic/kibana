/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState, useEffect } from 'react';
import { EuiButton, EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';
import { WizardNav } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { KibanaContext, isKibanaContext } from '../../../../../data_frame/common/kibana_context';
import { mlJobService } from '../../../../../services/job_service';
import { JsonFlyout } from './json_flyout';
import { isSingleMetricJobCreator } from '../../../common/job_creator';

export const SummaryStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const { jobCreator, jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [progress, setProgress] = useState(0);
  const [showJsonFlyout, setShowJsonFlyout] = useState(false);
  const [isValid, setIsValid] = useState(jobValidator.validationSummary.basic);

  function setProgressWrapper(p: number) {
    setProgress(p);
  }

  useEffect(() => {
    jobCreator.subscribeToProgress(setProgressWrapper);
  }, []);

  function start() {
    setShowJsonFlyout(false);
    jobCreator.createAndStartJob();
  }

  function viewResults() {
    const url = mlJobService.createResultsUrl(
      [jobCreator.jobId],
      jobCreator.start,
      jobCreator.end,
      isSingleMetricJobCreator(jobCreator) === true ? 'timeseriesexplorer' : 'explorer'
    );
    window.open(url, '_blank');
  }

  function toggleJsonFlyout() {
    setShowJsonFlyout(!showJsonFlyout);
  }

  useEffect(() => {
    setIsValid(jobValidator.validationSummary.basic);
  }, [jobValidatorUpdated]);

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
            <Fragment>
              <EuiButton onClick={start} isDisabled={progress > 0} disabled={isValid === false}>
                Create job
              </EuiButton>
              &emsp;
              <EuiButtonEmpty size="s" onClick={toggleJsonFlyout} isDisabled={progress > 0}>
                Preview job JSON
              </EuiButtonEmpty>
              {showJsonFlyout && (
                <JsonFlyout closeFlyout={() => setShowJsonFlyout(false)} jobCreator={jobCreator} />
              )}
              &emsp;
            </Fragment>
          )}
          {progress > 0 && (
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
