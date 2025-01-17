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
  useGeneratedHtmlId,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CombinedJobWithStats } from '../../../../../common/types/anomaly_detection_jobs';
import { useJobDetailFlyout } from './job_details_flyout_context';
import { useMlApi } from '../../../contexts/kibana';
import { JobDetails } from '../../jobs_list/components/job_details';
import { loadFullJob } from '../../jobs_list/components/utils';
import { useToastNotificationService } from '../../../services/toast_notification_service';

export const JobDetailsFlyout = () => {
  const {
    isFlyoutOpen,
    setIsFlyoutOpen,
    activeJobId: jobId,
    setActiveJobId,
  } = useJobDetailFlyout();
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'jobDetailsFlyout',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [jobDetails, setJobDetails] = useState<CombinedJobWithStats | null>(null);
  const mlApi = useMlApi();
  const { displayErrorToast } = useToastNotificationService();

  useEffect(() => {
    let mounted = true;
    const fetchJobDetails = async () => {
      if (jobId) {
        setIsLoading(true);
        try {
          const job = await loadFullJob(mlApi, jobId);
          if (mounted && job) {
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
    return () => {
      mounted = false;
    };
  }, [jobId, mlApi, displayErrorToast]);

  if (!jobId) {
    return null;
  }

  return isFlyoutOpen ? (
    <EuiFlyout
      data-test-subj="jobDetailsFlyout"
      type="overlay"
      size="m"
      ownFocus={false}
      onClose={() => {
        setIsFlyoutOpen(false);
        setActiveJobId(null);
      }}
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder data-test-subj={`jobDetailsFlyout-${jobId}`}>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>{jobId}</h2>
        </EuiTitle>
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
                jobId={jobId}
                job={jobDetails}
                addYourself={() => {}}
                removeYourself={() => {}}
                refreshJobList={() => {}}
                showClearButton={false}
              />
            ) : null}
          </EuiText>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : null;
};
