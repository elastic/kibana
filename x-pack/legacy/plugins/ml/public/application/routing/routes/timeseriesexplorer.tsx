/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { decode } from 'rison-node';
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
  const { _a, _g } = queryString.parse(location.search);
  let appState: any = {};
  let globalState: any = {};
  try {
    appState = decode(_a);
    globalState = decode(_g);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Could not parse global or app state');
  }
  if (appState.mlTimeSeriesExplorer === undefined) {
    appState.mlTimeSeriesExplorer = {};
  }
  globalState.fetch = () => {};
  globalState.on = () => {};
  globalState.off = () => {};
  globalState.save = () => {};

  return (
    <PageLoader context={context}>
      <TimeSeriesExplorerWrapper {...{ appState, globalState, config }} />
    </PageLoader>
  );
};

class AppState {
  fetch() {}
  on() {}
  off() {}
  save() {}
}

const TimeSeriesExplorerWrapper: FC<{ globalState: any; appState: any; config: any }> = ({
  globalState,
  appState,
  config,
}) => {
  if (globalState.time) {
    timefilter.setTime({
      from: globalState.time.from,
      to: globalState.time.to,
    });
  }

  const subscriptions = new Subscription();
  subscriptions.add(
    subscribeAppStateToObservable(AppState, 'mlSelectInterval', interval$, () => {})
  );
  subscriptions.add(
    subscribeAppStateToObservable(AppState, 'mlSelectSeverity', severity$, () => {})
  );

  const appStateHandler = (action: string, payload: any) => {
    switch (action) {
      case APP_STATE_ACTION.CLEAR:
        delete appState.mlTimeSeriesExplorer.detectorIndex;
        delete appState.mlTimeSeriesExplorer.entities;
        delete appState.mlTimeSeriesExplorer.forecastId;
        break;

      case APP_STATE_ACTION.GET_DETECTOR_INDEX:
        return appState.mlTimeSeriesExplorer.detectorIndex;
      case APP_STATE_ACTION.SET_DETECTOR_INDEX:
        appState.mlTimeSeriesExplorer.detectorIndex = payload;
        break;

      case APP_STATE_ACTION.GET_ENTITIES:
        return appState.mlTimeSeriesExplorer.entities;
      case APP_STATE_ACTION.SET_ENTITIES:
        appState.mlTimeSeriesExplorer.entities = payload;
        break;

      case APP_STATE_ACTION.GET_FORECAST_ID:
        return appState.mlTimeSeriesExplorer.forecastId;
      case APP_STATE_ACTION.SET_FORECAST_ID:
        appState.mlTimeSeriesExplorer.forecastId = payload;
        break;

      case APP_STATE_ACTION.GET_ZOOM:
        return appState.mlTimeSeriesExplorer.zoom;
      case APP_STATE_ACTION.SET_ZOOM:
        appState.mlTimeSeriesExplorer.zoom = payload;
        break;
      case APP_STATE_ACTION.UNSET_ZOOM:
        delete appState.mlTimeSeriesExplorer.zoom;
        break;
    }
  };

  useEffect(() => {
    return () => {
      subscriptions.unsubscribe();
    };
  });

  const tzConfig = config.get('dateFormat:tz');
  const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

  return (
    <TimeSeriesExplorer
      {...{
        appStateHandler,
        dateFormatTz,
        globalState,
        timefilter,
      }}
    />
  );
};
