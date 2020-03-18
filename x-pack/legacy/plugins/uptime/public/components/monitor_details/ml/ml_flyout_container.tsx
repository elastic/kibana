/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { hasNewMLJobSelector, isMLJobCreatingSelector } from '../../../state/selectors';
import { createMLJobAction, getMLJobAction } from '../../../state/actions';
import { MLJobLink } from './ml_job_link';
import * as labels from './translations';
import {
  useKibana,
  KibanaReactNotifications,
} from '../../../../../../../../src/plugins/kibana_react/public';
import { MachineLearningFlyoutView } from './ml_flyout';
import { ML_JOB_ID } from '../../../../common/constants';
import { UptimeSettingsContext } from '../../../contexts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const showMLJobNotification = (
  notifications: KibanaReactNotifications,
  monitorId: string,
  basePath: string,
  success: boolean,
  message = ''
) => {
  if (success) {
    notifications.toasts.success({
      title: <p>{labels.JOB_CREATED_SUCCESS_TITLE}</p>,
      body: (
        <p>
          {labels.JOB_CREATED_SUCCESS_MESSAGE}
          <MLJobLink monitorId={monitorId} basePath={basePath}>
            {labels.VIEW_JOB}
          </MLJobLink>
        </p>
      ),
      toastLifeTimeMs: 5000,
    });
  } else {
    notifications.toasts.warning({
      title: <p>{labels.JOB_CREATION_FAILED}</p>,
      body: message ?? <p>{labels.JOB_CREATION_FAILED_MESSAGE}</p>,
      toastLifeTimeMs: 5000,
    });
  }
};

export const MachineLearningFlyout: React.FC<Props> = ({ isOpen, onClose }) => {
  const { notifications } = useKibana();

  const dispatch = useDispatch();
  const { data: hasMLJob, error } = useSelector(hasNewMLJobSelector);
  const isMLJobCreating = useSelector(isMLJobCreatingSelector);
  const { basePath } = useContext(UptimeSettingsContext);

  let { monitorId } = useParams();
  monitorId = atob(monitorId || '');

  const createMLJob = () => dispatch(createMLJobAction.get({ monitorId }));

  const [isCreatingJob, setIsCreatingJob] = useState(false);

  useEffect(() => {
    if (isCreatingJob && !isMLJobCreating) {
      if (hasMLJob) {
        showMLJobNotification(notifications, monitorId as string, basePath, true);
        const loadMLJob = (jobId: string) =>
          dispatch(getMLJobAction.get({ jobId: `${monitorId}_${jobId}` }));

        loadMLJob(ML_JOB_ID);
      } else {
        showMLJobNotification(
          notifications,
          monitorId as string,
          basePath,
          false,
          error?.body?.message
        );
      }
      setIsCreatingJob(false);
      onClose();
    }
  }, [
    hasMLJob,
    notifications,
    onClose,
    isCreatingJob,
    error,
    isMLJobCreating,
    monitorId,
    dispatch,
    basePath,
  ]);

  if (!isOpen) {
    return null;
  }

  const createAnomalyJob = () => {
    setIsCreatingJob(true);
    createMLJob();
  };

  return (
    <>
      <MachineLearningFlyoutView
        isCreatingJob={isMLJobCreating}
        onClickCreate={createAnomalyJob}
        onClose={onClose}
      />
    </>
  );
};
