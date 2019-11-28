/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { decode } from 'rison-node';
import moment from 'moment';

// @ts-ignore
import queryString from 'query-string';
import { timefilter } from 'ui/timefilter';
import { MlRoute, PageLoader } from '../router';
import { useResolver } from '../router';
import { basicResolvers } from '../resolvers';
import { TimeSeriesExplorer } from '../../timeseriesexplorer';
import { mlJobService } from '../../services/job_service';
import { APP_STATE_ACTION } from '../../timeseriesexplorer/timeseriesexplorer_constants';

export const timeSeriesExplorerRoute: MlRoute = {
  path: '/timeseriesexplorer',
  render: (props: any, config: any) => <PageWrapper config={config} {...props} />,
};

const PageWrapper: FC<{ location: any; config: any }> = ({ location, config }) => {
  const { context } = useResolver('', config, {
    ...basicResolvers,
    jobs: mlJobService.loadJobsWrapper,
  });
  const { _a, _g } = queryString.parse(location.search);
  let appState: any = {};
  let globalState: any = {};
  try {
    appState = decode(_a);
    globalState = decode(_g);

    appState.mlTimeSeriesExplorer = {};
    globalState.fetch = () => {};
    globalState.on = () => {};
    globalState.save = () => {};
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Could not parse global state');
    window.location.href = '#data_frame_analytics';
  }

  timefilter.setTime({
    from: globalState.time.from,
    to: globalState.time.to,
  });

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

  const tzConfig = config.get('dateFormat:tz');
  const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

  return (
    <PageLoader context={context}>
      <TimeSeriesExplorer
        {...{
          appStateHandler,
          dateFormatTz,
          globalState,
          timefilter,
        }}
      />
    </PageLoader>
  );
};
