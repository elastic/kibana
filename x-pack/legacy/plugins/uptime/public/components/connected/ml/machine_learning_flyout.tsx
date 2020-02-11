/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { Component, useContext, useEffect, useState } from 'react';
// import { toMountPoint } from '../../../../../../../../../../src/plugins/kibana_react/public';
// import { startMLJob } from '../../../../../services/rest/ml';
// import { ApmPluginContext } from '../../../../../context/ApmPluginContext';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
// import { MLJobLink } from '../../functional/ml/ml_job_link';
import { MachineLearningFlyoutView } from '../../functional/ml/machine_learning_flyout/machine_learning_flyout';
import { UptimeSettingsContext } from '../../../contexts';
import { AppState } from '../../../state';
import { selectMonitorLocations, selectMonitorStatus } from '../../../state/selectors';
import { getMonitorStatus } from '../../../state/actions';
import { Container } from '../monitor/status_bar_container';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface State {
  isCreatingJob: boolean;
}

export const MachineLearningFlyout: Component<Props, State> = ({ isOpen, onClose }) => {
  // const { data: hasMLJob = false, status } = useFetcher(() => {
  //   if (selectedTransactionType) {
  //     // return getHasMLJob({
  //     //   serviceName: '',
  //     //   transactionType: selectedTransactionType,
  //     //   http,
  //     // });
  //   }
  // }, ['serviceName', selectedTransactionType]);

  const { basePath } = useContext(UptimeSettingsContext);

  useEffect(() => {
    fetch(basePath + '/api/ml/anomaly_detectors/uptime-duration-chart').then(response => {
      response.json().then(res => {
        setHasMLJob(res.count > 0);
      });
    });
    fetch(basePath + '/api/ml/anomaly_detectors/uptime-duration-chart').then(response => {
      response.json().then(res => {
        setHasMLJob(res.count > 0);
      });
    });
  }, [basePath]);

  // const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [hasMLJob, setHasMLJob] = useState(false);

  const onClickCreate = async ({ transactionType }: { transactionType: string }) => {
    setIsCreatingJob(true);
    try {
      // const data = {
      //   job_id: 'uptime-duration-chart',
      //   description: '',
      //   groups: [],
      //   analysis_config: {
      //     bucket_span: '15m',
      //     detectors: [{ function: 'high_mean', field_name: 'monitor.duration.us' }],
      //     influencers: [],
      //     summary_count_field_name: 'doc_count',
      //   },
      //   data_description: { time_field: '@timestamp' },
      //   custom_settings: { created_by: 'single-metric-wizard' },
      //   analysis_limits: { model_memory_limit: '10MB' },
      //   model_plot_config: { enabled: true },
      // };
      //
      // fetch('/api/ml/anomaly_detectors/uptime-duration-chart', {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(data),
      // });

      // const res = await startMLJob({ http, serviceName, transactionType });
      // const didSucceed = res.datafeeds[0].success && res.jobs[0].success;
      // if (!didSucceed) {
      //   throw new Error('Creating ML job failed');
      // }
      this.addSuccessToast({ transactionType });
    } catch (e) {
      this.addErrorToast();
    }

    setIsCreatingJob(false);
    onClose();
  };

  const addErrorToast = () => {
    const core = this.context;

    core.notifications.toasts.addWarning({
      title: i18n.translate(
        'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreationFailedNotificationTitle',
        {
          defaultMessage: 'Job creation failed',
        }
      ),
      text: toMountPoint(
        <p>
          {i18n.translate(
            'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreationFailedNotificationText',
            {
              defaultMessage:
                'Your current license may not allow for creating machine learning jobs, or this job may already exist.',
            }
          )}
        </p>
      ),
    });
  };

  const addSuccessToast = ({ transactionType }: { transactionType: string }) => {
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

  if (!isOpen) {
    return null;
  }

  return (
    <MachineLearningFlyoutView
      isCreatingJob={true}
      onClickCreate={onClickCreate}
      onClose={() => {}}
      hasMLJob={hasMLJob}
    />
  );
};

const mapStateToProps = (state: AppState, ownProps: OwnProps) => ({
  monitorStatus: selectMonitorStatus(state),
  monitorLocations: selectMonitorLocations(state, ownProps.monitorId),
});

const mapDispatchToProps = (dispatch: Dispatch<any>): DispatchProps => ({
  loadMonitorStatus: (dateStart: string, dateEnd: string, monitorId: string) => {
    dispatch(
      getMonitorStatus({
        monitorId,
        dateStart,
        dateEnd,
      })
    );
  },
});

// @ts-ignore TODO: Investigate typescript issues here
export const MonitorStatusBar = connect(mapStateToProps, mapDispatchToProps)(Container);
