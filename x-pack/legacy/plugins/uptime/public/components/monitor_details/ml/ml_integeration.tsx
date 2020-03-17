/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { MachineLearningFlyout } from './ml_flyout_container';
import { hasMLJobSelector } from '../../../state/selectors';
import { getMLJobAction } from '../../../state/actions';
import { ML_JOB_ID } from '../../../../common/constants';

export const MLIntegrationComponent = () => {
  const [isMlFlyoutOpen, setIsMlFlyoutOpen] = useState(false);

  let { monitorId } = useParams();
  monitorId = atob(monitorId || '');

  const dispatch = useDispatch();

  const hasMLJob = useSelector(hasMLJobSelector);

  useEffect(() => {
    const loadMLJob = (jobId: string) =>
      dispatch(getMLJobAction.get({ jobId: `${monitorId}_${jobId}` }));

    loadMLJob(ML_JOB_ID);
  }, [dispatch, monitorId]);

  const onButtonClick = () => {
    setIsMlFlyoutOpen(true);
  };

  const closeFlyout = () => {
    setIsMlFlyoutOpen(false);
  };

  return (
    <>
      <EuiButtonEmpty iconType="machineLearningApp" iconSide="left" onClick={onButtonClick}>
        {hasMLJob ? 'Disable Anomaly Detection' : 'Enable Anomaly Detection'}
      </EuiButtonEmpty>
      {isMlFlyoutOpen && <MachineLearningFlyout isOpen={isMlFlyoutOpen} onClose={closeFlyout} />}
    </>
  );
};
