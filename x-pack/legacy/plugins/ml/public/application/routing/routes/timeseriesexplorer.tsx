/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { usePrevious } from 'react-use';
import moment from 'moment';
// @ts-ignore
import queryString from 'query-string';

import { i18n } from '@kbn/i18n';

import { timefilter } from 'ui/timefilter';

import { MlJobWithTimeRange } from '../../../../common/types/jobs';

import { TimeSeriesExplorer } from '../../timeseriesexplorer';
import { getDateFormatTz, TimeRangeBounds } from '../../explorer/explorer_utils';
import { ml } from '../../services/ml_api_service';
import { mlJobService } from '../../services/job_service';
import { mlForecastService } from '../../services/forecast_service';
import { APP_STATE_ACTION } from '../../timeseriesexplorer/timeseriesexplorer_constants';
import {
  createTimeSeriesJobData,
  getAutoZoomDuration,
} from '../../timeseriesexplorer/timeseriesexplorer_utils';
import { useUrlState } from '../../util/url_state';
import { useTableInterval } from '../../components/controls/select_interval';
import { useTableSeverity } from '../../components/controls/select_severity';

import { MlRoute, PageLoader, PageProps } from '../router';
import { useRefresh } from '../use_refresh';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
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

  const refresh = useRefresh();
  useEffect(() => {
    if (refresh !== undefined) {
      setLastRefresh(refresh?.lastRefresh);

      if (refresh.timeRange !== undefined) {
        const { start, end } = refresh.timeRange;
        setGlobalState('time', {
          from: start,
          to: end,
        });
      }
    }
  }, [refresh?.lastRefresh]);

  useEffect(() => {
    timefilter.enableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();
  }, []);

  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
  }, [globalState?.time?.from, globalState?.time?.to]);

  let bounds: TimeRangeBounds | undefined;
  if (globalState?.time !== undefined) {
    bounds = {
      min: moment(globalState.time.from),
      max: moment(globalState.time.to),
    };
  }

  const selectedJobIds = globalState?.ml?.jobIds;
  // Sort selectedJobIds so we can be sure comparison works when stringifying.
  if (Array.isArray(selectedJobIds)) {
    selectedJobIds.sort();
  }

  // When changing jobs we'll clear appState (detectorIndex, entities, forecastId).
  // To retore settings from the URL on initial load we also need to check against
  // `previousSelectedJobIds` to avoid wiping appState.
  const previousSelectedJobIds = usePrevious(selectedJobIds);
  const isJobChange = !isEqual(previousSelectedJobIds, selectedJobIds);

  // Use a side effect to clear appState when changing jobs.
  useEffect(() => {
    if (selectedJobIds !== undefined && previousSelectedJobIds !== undefined) {
      setLastRefresh(Date.now());
      appStateHandler(APP_STATE_ACTION.CLEAR);
    }
  }, [JSON.stringify(selectedJobIds)]);

  // Next we get globalState and appState information to pass it on as props later.
  // If a job change is going on, we fall back to defaults (as if appState was already cleard),
  // otherwise the page could break.
  const selectedDetectorIndex = isJobChange
    ? 0
    : +appState?.mlTimeSeriesExplorer?.detectorIndex || 0;
  const selectedEntities = isJobChange ? undefined : appState?.mlTimeSeriesExplorer?.entities;
  const selectedForecastId = isJobChange ? undefined : appState?.mlTimeSeriesExplorer?.forecastId;
  const zoom = isJobChange ? undefined : appState?.mlTimeSeriesExplorer?.zoom;

  const selectedJob = selectedJobIds && mlJobService.getJob(selectedJobIds[0]);

  let autoZoomDuration: number | undefined;
  if (selectedJobIds !== undefined && selectedJobIds.length === 1 && selectedJob !== undefined) {
    autoZoomDuration = getAutoZoomDuration(
      createTimeSeriesJobData(mlJobService.jobs),
      mlJobService.getJob(selectedJobIds[0])
    );
  }

  const appStateHandler = useCallback(
    (action: string, payload?: any) => {
      const mlTimeSeriesExplorer =
        appState?.mlTimeSeriesExplorer !== undefined ? { ...appState.mlTimeSeriesExplorer } : {};

      switch (action) {
        case APP_STATE_ACTION.CLEAR:
          delete mlTimeSeriesExplorer.detectorIndex;
          delete mlTimeSeriesExplorer.entities;
          delete mlTimeSeriesExplorer.forecastId;
          delete mlTimeSeriesExplorer.zoom;
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

  const boundsMinMs = bounds?.min?.valueOf();
  const boundsMaxMs = bounds?.max?.valueOf();
  useEffect(() => {
    if (
      autoZoomDuration !== undefined &&
      boundsMinMs !== undefined &&
      boundsMaxMs !== undefined &&
      selectedJob !== undefined &&
      selectedForecastId !== undefined
    ) {
      mlForecastService
        .getForecastDateRange(selectedJob, selectedForecastId)
        .then(resp => {
          if (autoZoomDuration === undefined) {
            return;
          }

          const earliest = moment(resp.earliest || boundsMinMs);
          const latest = moment(resp.latest || boundsMaxMs);

          // Set the zoom to centre on the start of the forecast range, depending
          // on the time range of the forecast and data.
          // const earliestDataDate = first(contextChartData).date;
          const zoomLatestMs = Math.min(
            earliest.valueOf() + autoZoomDuration / 2,
            latest.valueOf()
          );
          const zoomEarliestMs = zoomLatestMs - autoZoomDuration;
          const zoomState = {
            from: moment(zoomEarliestMs).toISOString(),
            to: moment(zoomLatestMs).toISOString(),
          };
          appStateHandler(APP_STATE_ACTION.SET_ZOOM, zoomState);

          if (earliest.isBefore(moment(boundsMinMs)) || latest.isAfter(moment(boundsMaxMs))) {
            const earliestMs = Math.min(earliest.valueOf(), boundsMinMs);
            const latestMs = Math.max(latest.valueOf(), boundsMaxMs);
            setGlobalState('time', {
              from: moment(earliestMs).toISOString(),
              to: moment(latestMs).toISOString(),
            });
          }
        })
        .catch(resp => {
          // eslint-disable-next-line no-console
          console.error(
            'Time series explorer - error loading time range of forecast from elasticsearch:',
            resp
          );
        });
    }
  }, [selectedForecastId]);

  const [tableInterval] = useTableInterval();
  const [tableSeverity] = useTableSeverity();

  const tzConfig = config.get('dateFormat:tz');
  const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();

  return (
    <TimeSeriesExplorer
      {...{
        appStateHandler,
        autoZoomDuration,
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
