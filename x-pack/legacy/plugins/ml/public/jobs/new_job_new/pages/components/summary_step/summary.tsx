/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState, useEffect } from 'react';
import { EuiButton, EuiButtonEmpty, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { WizardNav } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { mlJobService } from '../../../../../services/job_service';
import { JsonFlyout } from './json_flyout';
import { isSingleMetricJobCreator } from '../../../common/job_creator';
import { JobDetails } from './job_details';
import { DetectorChart } from './detector_chart';
import { JobProgress } from './components/job_progress';

export const SummaryStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobCreator, jobValidator, jobValidatorUpdated, resultsLoader } = useContext(
    JobCreatorContext
  );
  const [progress, setProgress] = useState(resultsLoader.progress);
  const [showJsonFlyout, setShowJsonFlyout] = useState(false);
  const [isValid, setIsValid] = useState(jobValidator.validationSummary.basic);

  useEffect(() => {
    jobCreator.subscribeToProgress(setProgress);
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
          <DetectorChart />
          <EuiSpacer size="m" />
          <JobProgress progress={progress} />
          <EuiSpacer size="m" />
          <JobDetails />

          {progress === 0 && <WizardNav previous={() => setCurrentStep(WIZARD_STEPS.VALIDATION)} />}
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
    </Fragment>
  );
};
