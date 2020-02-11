/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
// import { toMountPoint } from '../../../../../../../../../../src/plugins/kibana_react/public';
// import { startMLJob } from '../../../../../services/rest/ml';
// import { ApmPluginContext } from '../../../../../context/ApmPluginContext';
import { MLJobLink } from '../../functional/ml/ml_job_link';
import { MachineLearningFlyoutView } from '../../functional/ml/machine_learning_flyout/machine_learning_flyout';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  urlParams: any;
}

interface State {
  isCreatingJob: boolean;
}

export class MachineLearningFlyout extends Component<Props, State> {
  public state: State = {
    isCreatingJob: false,
  };

  public onClickCreate = async ({ transactionType }: { transactionType: string }) => {
    this.setState({ isCreatingJob: true });
    try {
      const { http } = this.context.core;
      const { serviceName } = this.props.urlParams;
      if (!serviceName) {
        throw new Error('Service name is required to create this ML job');
      }
      // const res = await startMLJob({ http, serviceName, transactionType });
      // const didSucceed = res.datafeeds[0].success && res.jobs[0].success;
      // if (!didSucceed) {
      //   throw new Error('Creating ML job failed');
      // }
      this.addSuccessToast({ transactionType });
    } catch (e) {
      this.addErrorToast();
    }

    this.setState({ isCreatingJob: false });
    this.props.onClose();
  };

  public addErrorToast = () => {
    const core = this.context;
    const { urlParams } = this.props;
    const { serviceName } = urlParams;

    if (!serviceName) {
      return;
    }

    core.notifications.toasts.addWarning({
      title: i18n.translate(
        'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreationFailedNotificationTitle',
        {
          defaultMessage: 'Job creation failed',
        }
      ),
      text: toMountPoint(
        <p>
          {i18n.translate(
            'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreationFailedNotificationText',
            {
              defaultMessage:
                'Your current license may not allow for creating machine learning jobs, or this job may already exist.',
            }
          )}
        </p>
      ),
    });
  };

  public addSuccessToast = ({ transactionType }: { transactionType: string }) => {
    const { core } = this.context;
    const { urlParams } = this.props;

    // core.notifications.toasts.addSuccess({
    //   title: i18n.translate(
    //     'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreatedNotificationTitle',
    //     {
    //       defaultMessage: 'Job successfully created',
    //     }
    //   ),
    //   text: toMountPoint(
    //     <p>
    //       {i18n.translate(
    //         'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreatedNotificationText',
    //         {
    //           defaultMessage:
    //             'The analysis is now running for {serviceName} ({transactionType}). It might take a while before results are added to the response times graph.',
    //           values: {
    //             serviceName,
    //             transactionType,
    //           },
    //         }
    //       )}{' '}
    //       <ApmPluginContext.Provider value={this.context}>
    //         <MLJobLink serviceName={serviceName} transactionType={transactionType}>
    //           {i18n.translate(
    //             'xpack.apm.serviceDetails.enableAnomalyDetectionPanel.jobCreatedNotificationText.viewJobLinkText',
    //             {
    //               defaultMessage: 'View job',
    //             }
    //           )}
    //         </MLJobLink>
    //       </ApmPluginContext.Provider>
    //     </p>
    //   ),
    // });
  };

  public render() {
    const { isOpen, onClose, urlParams } = this.props;
    const { isCreatingJob } = this.state;

    if (!isOpen) {
      return null;
    }

    return (
      <MachineLearningFlyoutView
        isCreatingJob={isCreatingJob}
        onClickCreate={this.onClickCreate}
        onClose={onClose}
        urlParams={urlParams}
      />
    );
  }
}
