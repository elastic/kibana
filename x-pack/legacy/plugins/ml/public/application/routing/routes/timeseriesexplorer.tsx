/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { Subscription } from 'rxjs';

// @ts-ignore
import queryString from 'query-string';
import { timefilter } from 'ui/timefilter';
import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { TimeSeriesExplorer } from '../../timeseriesexplorer';
import { mlJobService } from '../../services/job_service';
import { APP_STATE_ACTION } from '../../timeseriesexplorer/timeseriesexplorer_constants';
import { subscribeAppStateToObservable } from '../../util/app_state_utils';
import { useUrlState } from '../../util/url_state';
import { interval$ } from '../../components/controls/select_interval';
import { severity$ } from '../../components/controls/select_severity';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../breadcrumbs';

export const timeSeriesExplorerRoute: MlRoute = {
  path: '/timeseriesexplorer',
  render: (props, config, deps) => <PageWrapper config={config} {...props} deps={deps} />,
  breadcrumbs: [
    ML_BREADCRUMB,
    ANOMALY_DETECTION_BREADCRUMB,
    {
      text: i18n.translate('xpack.ml.anomalyDetection.singleMetricViewerLabel', {
        defaultMessage: 'Single Metric Viewer',
      }),
      href: '',
    },
  ],
};

const PageWrapper: FC<PageProps> = ({ location, config, deps }) => {
  const { context } = useResolver('', undefined, config, {
    ...basicResolvers(deps),
    jobs: mlJobService.loadJobsWrapper,
  });

  return (
    <PageLoader context={context}>
      <TimeSeriesExplorerUrlStateManager config={config} />
    </PageLoader>
  );
};

const TimeSeriesExplorerUrlStateManager: FC<{ config: any }> = ({ config }) => {
  const [appState, setAppState] = useUrlState('_a');
  const [globalState] = useUrlState('_g');

  if (appState.mlTimeSeriesExplorer === undefined) {
    setAppState('mlTimeSeriesExplorer', {});
  }

  useEffect(() => {
    const globalStateTime = globalState.time;
    if (globalStateTime) {
      timefilter.setTime({
        from: globalStateTime.from,
        to: globalStateTime.to,
      });
    }
  }, [JSON.stringify([appState, globalState])]);

  useEffect(() => {
    const selectedJobIds = globalState?.ml?.jobIds;
  }, [globalState?.ml?.jobIds]);

  const appStateHandler = (action: string, payload: any) => {
    const mlTimeSeriesExplorer = appState.mlTimeSeriesExplorer;
    switch (action) {
      case APP_STATE_ACTION.CLEAR:
        delete mlTimeSeriesExplorer.detectorIndex;
        delete mlTimeSeriesExplorer.entities;
        delete mlTimeSeriesExplorer.forecastId;
        break;

      case APP_STATE_ACTION.GET_DETECTOR_INDEX:
        return mlTimeSeriesExplorer.detectorIndex;
      case APP_STATE_ACTION.SET_DETECTOR_INDEX:
        mlTimeSeriesExplorer.detectorIndex = payload;
        break;

      case APP_STATE_ACTION.GET_ENTITIES:
        return mlTimeSeriesExplorer.entities;
      case APP_STATE_ACTION.SET_ENTITIES:
        mlTimeSeriesExplorer.entities = payload;
        break;

      case APP_STATE_ACTION.GET_FORECAST_ID:
        return mlTimeSeriesExplorer.forecastId;
      case APP_STATE_ACTION.SET_FORECAST_ID:
        mlTimeSeriesExplorer.forecastId = payload;
        break;

      case APP_STATE_ACTION.GET_ZOOM:
        return mlTimeSeriesExplorer.zoom;
      case APP_STATE_ACTION.SET_ZOOM:
        mlTimeSeriesExplorer.zoom = payload;
        break;
      case APP_STATE_ACTION.UNSET_ZOOM:
        delete mlTimeSeriesExplorer.zoom;
        break;
    }

    setAppState('mlTimeSeriesExplorer', mlTimeSeriesExplorer);
  };

  useEffect(() => {
    const subscriptions = new Subscription();
    subscriptions.add(
      subscribeAppStateToObservable(appState, setAppState, 'mlSelectInterval', interval$)
    );
    subscriptions.add(
      subscribeAppStateToObservable(appState, setAppState, 'mlSelectSeverity', severity$)
    );

    return () => {
      subscriptions.unsubscribe();
    };
  }, []);

  const tzConfig = config.get('dateFormat:tz');
  const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

  if (appState.mlTimeSeriesExplorer === undefined) {
    return null;
  }

  return (
    <TimeSeriesExplorer
      {...{
        appStateHandler,
        dateFormatTz,
        globalState,
        selectedJobIds: globalState?.ml?.jobIds,
        timefilter,
      }}
    />
  );
};
