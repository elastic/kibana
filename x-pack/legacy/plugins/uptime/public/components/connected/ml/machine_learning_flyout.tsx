/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MachineLearningFlyoutView } from '../../functional';
import { hasMLJobSelector, isMLJobCreatingSelector, mlSelector } from '../../../state/selectors';
import { createMLJobAction, deleteMLJobAction, getMLJobAction } from '../../../state/actions';
import { MLJobLink } from '../../functional/ml/ml_job_link';
import * as labels from './translations';
import { ML_JOB_ID } from '../../../../common/constants';
import {
  useKibana,
  KibanaReactNotifications,
} from '../../../../../../../../src/plugins/kibana_react/public';

interface Props {
  isOpen: boolean;
  hasMLJob: boolean;
  isMLJobCreating: boolean;
  onClose: () => void;
  loadMLJob: () => void;
  createMLJob: () => void;
  mlError: any;
}

const showMLJobNotification = (
  notifications: KibanaReactNotifications,
  success: boolean,
  message = ''
) => {
  if (success) {
    notifications.toasts.success({
      title: <p>{labels.JOB_CREATED_SUCCESS_TITLE}</p>,
      body: (
        <p>
          {labels.JOB_CREATED_SUCCESS_MESSAGE}
          <MLJobLink>{labels.VIEW_JOB}</MLJobLink>
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

export const MachineLearningFlyout: Component<Props> = ({ isOpen, onClose }) => {
  const { notifications } = useKibana();
  const { errors } = useSelector(mlSelector);

  const dispatch = useDispatch();
  const hasMLJob = useSelector(hasMLJobSelector);
  const isMLJobCreating = useSelector(isMLJobCreatingSelector);

  const createMLJob = () => dispatch(createMLJobAction.get());

  const deleteMLJob = () => dispatch(deleteMLJobAction.get());

  const [isCreatingJob, setIsCreatingJob] = useState(false);

  useEffect(() => {
    const loadMLJob = (jobId: string) => dispatch(getMLJobAction.get({ jobId }));

    loadMLJob(ML_JOB_ID);
  }, [dispatch, isOpen]);

  useEffect(() => {
    if (isCreatingJob && !isMLJobCreating) {
      if (hasMLJob) {
        showMLJobNotification(notifications, true);
      } else {
        const err = errors?.pop();
        showMLJobNotification(notifications, false, err?.body?.message);
      }
      setIsCreatingJob(false);
      onClose();
    }
  }, [hasMLJob, notifications, onClose, isCreatingJob, errors, isMLJobCreating]);

  if (!isOpen) {
    return null;
  }

  const createAnomalyJob = () => {
    setIsCreatingJob(true);
    createMLJob();
  };

  return (
    <MachineLearningFlyoutView
      isCreatingJob={isMLJobCreating}
      onClickCreate={createAnomalyJob}
      onClickDelete={deleteMLJob}
      onClose={onClose}
      hasMLJob={hasMLJob}
    />
  );
};
