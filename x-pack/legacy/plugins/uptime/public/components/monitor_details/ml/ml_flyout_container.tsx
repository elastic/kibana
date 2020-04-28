/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  canCreateMLJobSelector,
  hasMLJobSelector,
  hasNewMLJobSelector,
  isMLJobCreatingSelector,
  selectDynamicSettings,
} from '../../../state/selectors';
import { createMLJobAction, getExistingMLJobAction } from '../../../state/actions';
import { MLJobLink } from './ml_job_link';
import * as labels from './translations';
import {
  useKibana,
  KibanaReactNotifications,
} from '../../../../../../../../src/plugins/kibana_react/public';
import { MLFlyoutView } from './ml_flyout';
import { ML_JOB_ID } from '../../../../common/constants';
import { UptimeRefreshContext, UptimeSettingsContext } from '../../../contexts';
import { useUrlParams } from '../../../hooks';
import { getDynamicSettings } from '../../../state/actions/dynamic_settings';

interface Props {
  onClose: () => void;
}

const showMLJobNotification = (
  notifications: KibanaReactNotifications,
  monitorId: string,
  basePath: string,
  range: { to: string; from: string },
  success: boolean,
  message = ''
) => {
  if (success) {
    notifications.toasts.success({
      title: <p>{labels.JOB_CREATED_SUCCESS_TITLE}</p>,
      body: (
        <p>
          {labels.JOB_CREATED_SUCCESS_MESSAGE}
          <MLJobLink monitorId={monitorId} basePath={basePath} dateRange={range}>
            {labels.VIEW_JOB}
          </MLJobLink>
        </p>
      ),
      toastLifeTimeMs: 10000,
    });
  } else {
    notifications.toasts.danger({
      title: <p>{labels.JOB_CREATION_FAILED}</p>,
      body: message ?? <p>{labels.JOB_CREATION_FAILED_MESSAGE}</p>,
      toastLifeTimeMs: 10000,
    });
  }
};

export const MachineLearningFlyout: React.FC<Props> = ({ onClose }) => {
  const { notifications } = useKibana();

  const dispatch = useDispatch();
  const { data: hasMLJob, error } = useSelector(hasNewMLJobSelector);
  const isMLJobCreating = useSelector(isMLJobCreatingSelector);
  const { settings } = useSelector(selectDynamicSettings);
  useEffect(() => {
    // Attempt to load or refresh the dynamic settings
    dispatch(getDynamicSettings({}));
  }, [dispatch]);
  const heartbeatIndices = settings?.heartbeatIndices || '';
  const { basePath } = useContext(UptimeSettingsContext);

  const { refreshApp } = useContext(UptimeRefreshContext);

  let { monitorId } = useParams();
  monitorId = atob(monitorId || '');

  const canCreateMLJob = useSelector(canCreateMLJobSelector) && heartbeatIndices !== '';

  // This function is a noop in the form's disabled state
  const createMLJob = heartbeatIndices
    ? () => dispatch(createMLJobAction.get({ monitorId: monitorId as string, heartbeatIndices }))
    : () => null;

  const { data: uptimeJobs } = useSelector(hasMLJobSelector);

  const hasExistingMLJob = !!uptimeJobs?.jobsExist;

  const [isCreatingJob, setIsCreatingJob] = useState(false);

  const [getUrlParams] = useUrlParams();
  const { dateRangeStart, dateRangeEnd } = getUrlParams();

  useEffect(() => {
    if (isCreatingJob && !isMLJobCreating) {
      if (hasMLJob) {
        showMLJobNotification(
          notifications,
          monitorId as string,
          basePath,
          { to: dateRangeEnd, from: dateRangeStart },
          true
        );
        const loadMLJob = (jobId: string) =>
          dispatch(getExistingMLJobAction.get({ monitorId: monitorId as string }));

        loadMLJob(ML_JOB_ID);

        refreshApp();
      } else {
        showMLJobNotification(
          notifications,
          monitorId as string,
          basePath,
          { to: dateRangeEnd, from: dateRangeStart },
          false,
          error?.message || error?.body?.message
        );
      }
      setIsCreatingJob(false);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (hasExistingMLJob && !isMLJobCreating && !hasMLJob && heartbeatIndices) {
      setIsCreatingJob(true);
      dispatch(createMLJobAction.get({ monitorId: monitorId as string, heartbeatIndices }));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, hasExistingMLJob, heartbeatIndices, monitorId, hasMLJob]);

  if (hasExistingMLJob) {
    return null;
  }

  const createAnomalyJob = () => {
    setIsCreatingJob(true);
    createMLJob();
  };

  return (
    <MLFlyoutView
      canCreateMLJob={!!canCreateMLJob}
      isCreatingJob={isMLJobCreating}
      onClickCreate={createAnomalyJob}
      onClose={onClose}
    />
  );
};
