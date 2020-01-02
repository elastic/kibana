/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import moment from 'moment';

// @ts-ignore
import queryString from 'query-string';

import { timefilter } from 'ui/timefilter';

import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { TimeSeriesExplorer } from '../../timeseriesexplorer';
import { mlJobService } from '../../services/job_service';
import { APP_STATE_ACTION } from '../../timeseriesexplorer/timeseriesexplorer_constants';
import { useUrlState } from '../../util/url_state';
import { useTableInterval } from '../../components/controls/select_interval';
import { useTableSeverity } from '../../components/controls/select_severity';
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

const PageWrapper: FC<PageProps> = ({ config, deps }) => {
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
  const [globalState, setGlobalState] = useUrlState('_g');

  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
  }, [JSON.stringify(globalState?.time)]);

  const selectedJobIds = globalState?.ml?.jobIds;
  const selectedDetectorIndex = appState?.mlTimeSeriesExplorer?.detectorIndex;
  const selectedEntities = appState?.mlTimeSeriesExplorer?.entities;
  const selectedForecastId = appState?.mlTimeSeriesExplorer?.forecastId;
  const zoom = appState?.mlTimeSeriesExplorer?.zoom;

  const appStateHandler = useCallback(
    (action: string, payload: any) => {
      const mlTimeSeriesExplorer =
        appState?.mlTimeSeriesExplorer !== undefined ? { ...appState.mlTimeSeriesExplorer } : {};

      switch (action) {
        case APP_STATE_ACTION.CLEAR:
          delete mlTimeSeriesExplorer.detectorIndex;
          delete mlTimeSeriesExplorer.entities;
          delete mlTimeSeriesExplorer.forecastId;
          break;

        case APP_STATE_ACTION.SET_DETECTOR_INDEX:
          mlTimeSeriesExplorer.detectorIndex = payload;
          break;

        case APP_STATE_ACTION.SET_ENTITIES:
          mlTimeSeriesExplorer.entities = payload;
          break;

        case APP_STATE_ACTION.SET_FORECAST_ID:
          mlTimeSeriesExplorer.forecastId = payload;
          break;

        case APP_STATE_ACTION.SET_ZOOM:
          mlTimeSeriesExplorer.zoom = payload;
          break;
        case APP_STATE_ACTION.UNSET_ZOOM:
          delete mlTimeSeriesExplorer.zoom;
          break;
      }

      setAppState('mlTimeSeriesExplorer', mlTimeSeriesExplorer);
    },
    [JSON.stringify(appState)]
  );

  const [tableInterval] = useTableInterval();
  const [tableSeverity] = useTableSeverity();

  const tzConfig = config.get('dateFormat:tz');
  const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

  return (
    <TimeSeriesExplorer
      {...{
        appStateHandler,
        dateFormatTz,
        selectedJobIds,
        selectedDetectorIndex: +selectedDetectorIndex || 0,
        selectedEntities,
        selectedForecastId,
        setGlobalState,
        tableInterval: tableInterval.val,
        tableSeverity: tableSeverity.val,
        timefilter,
        zoom,
      }}
    />
  );
};
