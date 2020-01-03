/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { Subscription } from 'rxjs';

// @ts-ignore
import queryString from 'query-string';

import { timefilter } from 'ui/timefilter';

import { MlJobWithTimeRange } from '../../../../common/types/jobs';

import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { TimeSeriesExplorer } from '../../timeseriesexplorer';
import { getDateFormatTz } from '../../explorer/explorer_utils';
import { annotationsRefresh$ } from '../../services/annotations_service';
import { mlTimefilterRefresh$ } from '../../services/timefilter_refresh_service';
import { ml } from '../../services/ml_api_service';
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
  const { context, results } = useResolver('', undefined, config, {
    ...basicResolvers(deps),
    jobs: mlJobService.loadJobsWrapper,
    jobsWithTimeRange: () => ml.jobs.jobsWithTimerange(getDateFormatTz()),
  });

  return (
    <PageLoader context={context}>
      <TimeSeriesExplorerUrlStateManager
        config={config}
        jobsWithTimeRange={results.jobsWithTimeRange.jobs}
      />
    </PageLoader>
  );
};

interface TimeSeriesExplorerUrlStateManager {
  config: any;
  jobsWithTimeRange: MlJobWithTimeRange[];
}

const TimeSeriesExplorerUrlStateManager: FC<TimeSeriesExplorerUrlStateManager> = ({
  config,
  jobsWithTimeRange,
}) => {
  const [appState, setAppState] = useUrlState('_a');
  const [globalState, setGlobalState] = useUrlState('_g');

  const [lastRefresh, setLastRefresh] = useState(0);
  const refreshHandler = () => setLastRefresh(Date.now());

  useEffect(() => {
    timefilter.enableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();

    const subscriptions = new Subscription();

    subscriptions.add(annotationsRefresh$.subscribe(refreshHandler));
    subscriptions.add(mlTimefilterRefresh$.subscribe(refreshHandler));

    subscriptions.add(timefilter.getTimeUpdate$().subscribe(refreshHandler));

    return () => subscriptions.unsubscribe();
  }, []);

  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
  }, [JSON.stringify(globalState?.time)]);
  let bounds;
  if (globalState?.time !== undefined) {
    bounds = {
      min: moment(globalState.time.from),
      max: moment(globalState.time.to),
    };
  }

  const selectedJobIds = globalState?.ml?.jobIds;
  const selectedDetectorIndex = +appState?.mlTimeSeriesExplorer?.detectorIndex || 0;
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
    [JSON.stringify([appState, globalState])]
  );

  const [tableInterval] = useTableInterval();
  const [tableSeverity] = useTableSeverity();

  const tzConfig = config.get('dateFormat:tz');
  const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

  return (
    <TimeSeriesExplorer
      {...{
        appStateHandler,
        bounds,
        dateFormatTz,
        jobsWithTimeRange,
        lastRefresh,
        selectedJobIds,
        selectedDetectorIndex,
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
