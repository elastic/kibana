/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState, useEffect } from 'react';
import { EuiButton, EuiButtonEmpty, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { WizardNav } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { JobRunner } from '../../../common/job_runner';
import { mlJobService } from '../../../../../services/job_service';
import { JsonFlyout } from './json_flyout';
import { isSingleMetricJobCreator } from '../../../common/job_creator';
import { JobDetails } from './job_details';
import { DetectorChart } from './detector_chart';
import { JobProgress } from './components/job_progress';
import { PostSaveOptions } from './components/post_save_options';

export const SummaryStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobCreator, jobValidator, jobValidatorUpdated, resultsLoader } = useContext(
    JobCreatorContext
  );
  const [progress, setProgress] = useState(resultsLoader.progress);
  const [showJsonFlyout, setShowJsonFlyout] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [isValid, setIsValid] = useState(jobValidator.validationSummary.basic);
  const [jobRunner, setJobRunner] = useState<JobRunner | null>(null);

  useEffect(() => {
    jobCreator.subscribeToProgress(setProgress);
  }, []);

  async function start() {
    setShowJsonFlyout(false);
    setCreatingJob(true);
    try {
      const jr = await jobCreator.createAndStartJob();
      setJobRunner(jr);
    } catch (error) {
      // catch and display all job creation errors
      toastNotifications.addDanger({
        title: i18n.translate('xpack.ml.newJob.wizard.createJobError', {
          defaultMessage: `Job creation error`,
        }),
        text: error.message,
      });
      setCreatingJob(false);
    }
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
              <EuiButton
                onClick={start}
                isDisabled={creatingJob === true || isValid === false}
                data-test-subj="mlJobWizardButtonCreateJob"
              >
                Create job
              </EuiButton>
              &emsp;
            </Fragment>
          )}
          {creatingJob === false && (
            <Fragment>
              <EuiButtonEmpty
                size="s"
                onClick={toggleJsonFlyout}
                isDisabled={progress > 0}
                data-test-subj="mlJobWizardButtonPreviewJobJson"
              >
                Preview job JSON
              </EuiButtonEmpty>
              {showJsonFlyout && (
                <JsonFlyout closeFlyout={() => setShowJsonFlyout(false)} jobCreator={jobCreator} />
              )}
            </Fragment>
          )}
          {progress > 0 && (
            <Fragment>
              <EuiButton onClick={viewResults} data-test-subj="mlJobWizardButtonViewResults">
                View results
              </EuiButton>
              {progress === 100 && (
                <Fragment>
                  <PostSaveOptions jobRunner={jobRunner} />
                </Fragment>
              )}
            </Fragment>
          )}
        </Fragment>
      )}
    </Fragment>
  );
};
