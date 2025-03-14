/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiText,
  EuiTitle,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlexGroup,
  useGeneratedHtmlId,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useMountedState from 'react-use/lib/useMountedState';
import type { CombinedJobWithStats } from '../../../../../common/types/anomaly_detection_jobs';
import { useMlApi, useMlLocator, useNavigateToPath } from '../../../contexts/kibana';
import { JobDetails } from '../../jobs_list/components/job_details';
import { loadFullJob } from '../../jobs_list/components/utils';
import { useToastNotificationService } from '../../../services/toast_notification_service';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { useJobInfoFlyouts } from './job_details_flyout_context';

const doNothing = () => {};
export const JobDetailsFlyout = () => {
  const {
    isDetailFlyoutOpen,
    activeJobId: jobId,
    setActiveJobId,
    closeActiveFlyout,
  } = useJobInfoFlyouts();
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'jobDetailsFlyout',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [jobDetails, setJobDetails] = useState<CombinedJobWithStats | null>(null);
  const mlApi = useMlApi();
  const { displayErrorToast } = useToastNotificationService();

  const isMounted = useMountedState();
  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!isMounted()) return;
      if (jobId) {
        setIsLoading(true);
        try {
          const job = await loadFullJob(mlApi, jobId);
          if (job) {
            setJobDetails(job);
          }
        } catch (error) {
          displayErrorToast(
            error,
            i18n.translate('xpack.ml.jobDetailsFlyout.errorFetchingJobDetails', {
              defaultMessage: 'Error fetching job details',
            })
          );
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchJobDetails();
  }, [jobId, mlApi, displayErrorToast, isMounted]);

  const navigateToPath = useNavigateToPath();
  const mlLocator = useMlLocator();

  if (!jobId) {
    return null;
  }

  const openJobsList = async () => {
    const pageState = { jobId };
    if (mlLocator) {
      const url = await mlLocator.getUrl({
        page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
        pageState,
      });
      await navigateToPath(url);
    }
  };

  return isDetailFlyoutOpen ? (
    <EuiFlyout
      data-test-subj="jobDetailsFlyout"
      type="overlay"
      size="m"
      ownFocus={false}
      onClose={() => {
        closeActiveFlyout();
        setActiveJobId(null);
      }}
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder data-test-subj={`jobDetailsFlyout-${jobId}`}>
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiTitle size="s">
              <h2 id={flyoutTitleId}>{jobId}</h2>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={openJobsList}>
              <FormattedMessage
                id="xpack.ml.jobDetailsFlyout.openJobsListButton"
                defaultMessage="Open jobs list"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading ? (
          <EuiText textAlign="center">
            <EuiLoadingSpinner size="m" />
          </EuiText>
        ) : (
          <EuiText>
            {jobDetails ? (
              <JobDetails
                mode="flyout"
                jobId={jobId}
                job={jobDetails}
                // No need to add or remove from the job list
                addYourself={doNothing}
                removeYourself={doNothing}
                refreshJobList={doNothing}
                showClearButton={false}
              />
            ) : null}
          </EuiText>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : null;
};
