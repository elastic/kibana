/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { MachineLearningFlyout } from './ml_flyout_container';
import {
  canDeleteMLJobSelector,
  hasMLFeatureAvailable,
  hasMLJobSelector,
  isMLJobDeletedSelector,
  isMLJobDeletingSelector,
} from '../../../state/selectors';
import { deleteMLJobAction, getExistingMLJobAction, resetMLState } from '../../../state/actions';
import { ConfirmJobDeletion } from './confirm_delete';
import { UptimeRefreshContext } from '../../../contexts';
import { getMLJobId } from '../../../state/api/ml_anomaly';
import * as labels from './translations';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { JobStat } from '../../../../../../../plugins/ml/common/types/anomaly_detection_jobs';

export const MLIntegrationComponent = () => {
  const [isMlFlyoutOpen, setIsMlFlyoutOpen] = useState(false);
  const [isConfirmDeleteJobOpen, setIsConfirmDeleteJobOpen] = useState(false);

  const { lastRefresh, refreshApp } = useContext(UptimeRefreshContext);

  const { notifications } = useKibana();

  let { monitorId } = useParams();
  monitorId = atob(monitorId || '');

  const dispatch = useDispatch();

  const { data } = useSelector(hasMLJobSelector);

  const isMLAvailable = useSelector(hasMLFeatureAvailable);
  const canDeleteMLJob = useSelector(canDeleteMLJobSelector);

  const hasMLJob =
    !!data?.jobsExist &&
    data.jobs.find((job: JobStat) => job.id === getMLJobId(monitorId as string));

  const deleteMLJob = () => dispatch(deleteMLJobAction.get({ monitorId: monitorId as string }));
  const isMLJobDeleting = useSelector(isMLJobDeletingSelector);
  const { data: jobDeletionSuccess } = useSelector(isMLJobDeletedSelector);

  useEffect(() => {
    if (isMLAvailable) {
      dispatch(getExistingMLJobAction.get({ monitorId: monitorId as string }));
    }
  }, [dispatch, isMLAvailable, monitorId, lastRefresh]);

  useEffect(() => {
    if (isConfirmDeleteJobOpen && jobDeletionSuccess?.[getMLJobId(monitorId as string)]?.deleted) {
      setIsConfirmDeleteJobOpen(false);
      notifications.toasts.success({
        title: <p>{labels.JOB_DELETION}</p>,
        body: <p>{labels.JOB_DELETION_SUCCESS}</p>,
        toastLifeTimeMs: 3000,
      });
      dispatch(resetMLState());

      // wait a couple seconds to make sure, job is deleted
      setTimeout(() => {
        refreshApp();
      }, 2000);
    }
  }, [
    isMLJobDeleting,
    isConfirmDeleteJobOpen,
    jobDeletionSuccess,
    monitorId,
    refreshApp,
    notifications.toasts,
    dispatch,
  ]);

  const onButtonClick = () => {
    setIsMlFlyoutOpen(true);
  };

  const closeFlyout = () => {
    setIsMlFlyoutOpen(false);
  };

  const confirmDeleteMLJob = () => {
    setIsConfirmDeleteJobOpen(true);
  };

  return (
    <>
      <EuiButtonEmpty
        iconType="machineLearningApp"
        iconSide="left"
        onClick={hasMLJob ? confirmDeleteMLJob : onButtonClick}
        disabled={hasMLJob && !canDeleteMLJob}
      >
        {hasMLJob ? 'Disable Anomaly Detection' : 'Enable Anomaly Detection'}
      </EuiButtonEmpty>
      {isMlFlyoutOpen && <MachineLearningFlyout isOpen={isMlFlyoutOpen} onClose={closeFlyout} />}
      <ConfirmJobDeletion
        open={isConfirmDeleteJobOpen}
        onConfirm={deleteMLJob}
        loading={isMLJobDeleting}
        onCancel={() => {
          setIsConfirmDeleteJobOpen(false);
        }}
      />
    </>
  );
};
