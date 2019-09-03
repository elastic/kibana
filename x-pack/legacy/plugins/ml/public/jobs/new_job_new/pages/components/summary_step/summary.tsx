/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { toastNotifications } from 'ui/notify';
import { PreviousButton } from '../wizard_nav';
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
import { convertToAdvancedJob, resetJob } from '../../../common/job_creator/util/general';

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
        title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.createJobError', {
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

  function clickResetJob() {
    resetJob(jobCreator);
  }

  const convertToAdvanced = () => {
    convertToAdvancedJob(jobCreator);
  };

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

          <EuiHorizontalRule />
          <EuiFlexGroup>
            {progress < 100 && (
              <Fragment>
                <EuiFlexItem grow={false}>
                  <PreviousButton
                    previous={() => setCurrentStep(WIZARD_STEPS.VALIDATION)}
                    previousActive={creatingJob === false && isValid === true}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={start}
                    isDisabled={creatingJob === true || isValid === false}
                    data-test-subj="mlJobWizardButtonCreateJob"
                    fill
                  >
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.summaryStep.createJobButton"
                      defaultMessage="Create job"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </Fragment>
            )}
            {creatingJob === false && (
              <Fragment>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={toggleJsonFlyout}
                    isDisabled={progress > 0}
                    data-test-subj="mlJobWizardButtonPreviewJobJson"
                  >
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.summaryStep.previewJsonButton"
                      defaultMessage="Preview job JSON"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={convertToAdvanced}>
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.summaryStep.convertToAdvancedButton"
                      defaultMessage="Convert to advanced job"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </Fragment>
            )}
            {progress > 0 && (
              <Fragment>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={viewResults} data-test-subj="mlJobWizardButtonViewResults">
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.summaryStep.viewResultsButton"
                      defaultMessage="View results"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </Fragment>
            )}
            {progress === 100 && (
              <Fragment>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={clickResetJob} data-test-subj="mlJobWizardButtonResetJob">
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.summaryStep.resetJobButton"
                      defaultMessage="Reset job"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <PostSaveOptions jobRunner={jobRunner} />
              </Fragment>
            )}
          </EuiFlexGroup>
          {showJsonFlyout && (
            <JsonFlyout closeFlyout={() => setShowJsonFlyout(false)} jobCreator={jobCreator} />
          )}
        </Fragment>
      )}
    </Fragment>
  );
};
