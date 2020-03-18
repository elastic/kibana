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
  hasMLJobSelector,
  isMLJobDeletedSelector,
  isMLJobDeletingSelector,
} from '../../../state/selectors';
import { deleteMLJobAction, getMLJobAction } from '../../../state/actions';
import { ML_JOB_ID } from '../../../../common/constants';
import { ConfirmJobDeletion } from './confirm_delete';
import { UptimeRefreshContext } from '../../../contexts';

export const MLIntegrationComponent = () => {
  const [isMlFlyoutOpen, setIsMlFlyoutOpen] = useState(false);
  const [isConfirmDeleteJobOpen, setIsConfirmDeleteJobOpen] = useState(false);

  const { lastRefresh, refreshApp } = useContext(UptimeRefreshContext);

  let { monitorId } = useParams();
  monitorId = atob(monitorId || '');

  const dispatch = useDispatch();

  const { data, loading } = useSelector(hasMLJobSelector);

  const hasMLJob = !!data;

  const deleteMLJob = () => dispatch(deleteMLJobAction.get({ monitorId }));
  const isMLJobDeleting = useSelector(isMLJobDeletingSelector);
  const { data: jobDeletionSuccess } = useSelector(isMLJobDeletedSelector);

  useEffect(() => {
    dispatch(getMLJobAction.get({ jobId: `${monitorId}_${ML_JOB_ID}` }));
  }, [dispatch, monitorId]);

  useEffect(() => {
    if (isConfirmDeleteJobOpen && jobDeletionSuccess?.[`${monitorId}_${ML_JOB_ID}`]?.deleted) {
      setIsConfirmDeleteJobOpen(false);
      // wait a couple seconds to make sure, job is deleted
      setTimeout(() => {
        refreshApp();
      }, 2000);
    }
  }, [isMLJobDeleting, isConfirmDeleteJobOpen, jobDeletionSuccess, monitorId, refreshApp]);

  useEffect(() => {
    dispatch(getMLJobAction.get({ jobId: `${monitorId}_${ML_JOB_ID}` }));
  }, [dispatch, lastRefresh, monitorId]);

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
