/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, useContext, useEffect } from 'react';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { AppState } from '../../../state';
import { MachineLearningFlyoutView } from '../../functional';
import { hasMLJobSelector, isMLJobCreating } from '../../../state/selectors';
import { createMLJobAction, getMLJobAction } from '../../../state/actions';
import { MLJobLink } from '../../functional/ml/ml_job_link';
import * as labels from './translations';
import { ML_JOB_ID } from '../../../../common/constants';
import { toMountPoint, useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

interface Props {
  isOpen: boolean;
  hasMLJob: boolean;
  isMLJobCreating: boolean;
  onClose: () => void;
  loadMLJob: () => void;
  createMLJob: () => void;
}

export const MLFlyoutContainer: Component<Props> = ({
  isOpen,
  onClose,
  loadMLJob,
  hasMLJob,
  createMLJob,
  isJobCreating,
}) => {
  const { notifications } = useKibana();
  useEffect(() => {
    loadMLJob(ML_JOB_ID);
  }, [loadMLJob]);

  const onClickCreate = async () => {
    try {
      // const didSucceed = res.datafeeds[0].success && res.jobs[0].success;
      // if (!didSucceed) {
      //   throw new Error('Creating ML job failed');
      // }
      createMLJob();
      // addSuccessToast();
    } catch (e) {
      // addErrorToast();
    }

    // onClose();
  };

  // useEffect(() => {
  //   notifications.toasts.warning({
  //     title: <p>{labels.JOB_CREATION_FAILED}</p>,
  //     body: toMountPoint(<p>{labels.JOB_CREATION_FAILED_MESSAGE}</p>),
  //   });
  // }, []);
  //
  // useEffect(() => {
  //   notifications.toasts.success({
  //     title: <p>{labels.JOB_CREATED_SUCCESS_TITLE}</p>,
  //     body: toMountPoint(
  //       <p>
  //         {labels.JOB_CREATED_SUCCESS_MESSAGE}
  //         <MLJobLink>{labels.VIEW_JOB}</MLJobLink>
  //       </p>
  //     ),
  //   });
  // }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <MachineLearningFlyoutView
      isCreatingJob={isJobCreating}
      onClickCreate={createMLJob}
      onClose={onClose}
      hasMLJob={hasMLJob}
    />
  );
};

const mapStateToProps = (state: AppState) => ({
  hasMLJob: hasMLJobSelector(state),
  isMLJobCreating: isMLJobCreating(state),
});

const mapDispatchToProps = (dispatch: Dispatch<any>): any => ({
  loadMLJob: (jobId: string) => dispatch(getMLJobAction.get({ jobId })),
  createMLJob: () => dispatch(createMLJobAction.get()),
});

export const MachineLearningFlyout = connect(
  mapStateToProps,
  mapDispatchToProps
)(MLFlyoutContainer);
