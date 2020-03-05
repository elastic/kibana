/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { usePrevious } from 'react-use';
import moment from 'moment';

import { i18n } from '@kbn/i18n';

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
  validateJobSelection,
} from '../../timeseriesexplorer/timeseriesexplorer_utils';
import { TimeSeriesExplorerPage } from '../../timeseriesexplorer/timeseriesexplorer_page';
import { TimeseriesexplorerNoJobsFound } from '../../timeseriesexplorer/components/timeseriesexplorer_no_jobs_found';
import { useUrlState } from '../../util/url_state';
import { useTableInterval } from '../../components/controls/select_interval';
import { useTableSeverity } from '../../components/controls/select_severity';

import { MlRoute, PageLoader, PageProps } from '../router';
import { useRefresh } from '../use_refresh';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../breadcrumbs';
import { useTimefilter } from '../../contexts/kibana';

export const timeSeriesExplorerRoute: MlRoute = {
  path: '/timeseriesexplorer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
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

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { context, results } = useResolver('', undefined, deps.config, {
    ...basicResolvers(deps),
    jobs: mlJobService.loadJobsWrapper,
    jobsWithTimeRange: () => ml.jobs.jobsWithTimerange(getDateFormatTz()),
  });

  return (
    <PageLoader context={context}>
      <TimeSeriesExplorerUrlStateManager
        config={deps.config}
        jobsWithTimeRange={results.jobsWithTimeRange.jobs}
      />
    </PageLoader>
  );
};

interface AppStateZoom {
  from: string;
  to: string;
}

interface TimeSeriesExplorerUrlStateManager {
  config: any;
  jobsWithTimeRange: MlJobWithTimeRange[];
}

export const TimeSeriesExplorerUrlStateManager: FC<TimeSeriesExplorerUrlStateManager> = ({
  config,
  jobsWithTimeRange,
}) => {
  const [appState, setAppState] = useUrlState('_a');
  const [globalState, setGlobalState] = useUrlState('_g');
  const [lastRefresh, setLastRefresh] = useState(0);
  const previousRefresh = usePrevious(lastRefresh);
  const [selectedJobId, setSelectedJobId] = useState<string>();
  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

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

  // We cannot simply infer bounds from the globalState's `time` attribute
  // with `moment` since it can contain custom strings such as `now-15m`.
  // So when globalState's `time` changes, we update the timefilter and use
  // `timefilter.getBounds()` to update `bounds` in this component's state.
  const [bounds, setBounds] = useState<TimeRangeBounds | undefined>(undefined);
  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });

      const timefilterBounds = timefilter.getBounds();
      // Only if both min/max bounds are valid moment times set the bounds.
      // An invalid string restored from globalState might return `undefined`.
      if (timefilterBounds?.min !== undefined && timefilterBounds?.max !== undefined) {
        setBounds(timefilter.getBounds());
      }
    }
  }, [globalState?.time?.from, globalState?.time?.to]);

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
    const validatedJobId = validateJobSelection(jobsWithTimeRange, selectedJobIds, setGlobalState);
    if (typeof validatedJobId === 'string') {
      setSelectedJobId(validatedJobId);
    }
  }, [JSON.stringify(selectedJobIds)]);

  // Next we get globalState and appState information to pass it on as props later.
  // If a job change is going on, we fall back to defaults (as if appState was already cleared),
  // otherwise the page could break.
  const selectedDetectorIndex = isJobChange
    ? 0
    : +appState?.mlTimeSeriesExplorer?.detectorIndex || 0;
  const selectedEntities = isJobChange ? undefined : appState?.mlTimeSeriesExplorer?.entities;
  const selectedForecastId = isJobChange ? undefined : appState?.mlTimeSeriesExplorer?.forecastId;
  const zoom: AppStateZoom | undefined = isJobChange
    ? undefined
    : appState?.mlTimeSeriesExplorer?.zoom;

  const selectedJob = selectedJobId !== undefined ? mlJobService.getJob(selectedJobId) : undefined;
  const timeSeriesJobs = createTimeSeriesJobData(mlJobService.jobs);

  let autoZoomDuration: number | undefined;
  if (selectedJobId !== undefined && selectedJob !== undefined) {
    autoZoomDuration = getAutoZoomDuration(timeSeriesJobs, selectedJob);
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
          delete mlTimeSeriesExplorer.zoom;
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

  const [selectedForecastIdProp, setSelectedForecastIdProp] = useState<string | undefined>(
    appState?.mlTimeSeriesExplorer?.forecastId
  );

  useEffect(() => {
    if (
      autoZoomDuration !== undefined &&
      boundsMinMs !== undefined &&
      boundsMaxMs !== undefined &&
      selectedJob !== undefined &&
      selectedForecastId !== undefined
    ) {
      if (selectedForecastIdProp !== selectedForecastId) {
        setSelectedForecastIdProp(undefined);
      }
      mlForecastService
        .getForecastDateRange(selectedJob, selectedForecastId)
        .then(resp => {
          if (autoZoomDuration === undefined) {
            return;
          }

          const earliest = moment(resp.earliest || boundsMinMs);
          const latest = moment(resp.latest || boundsMaxMs);

          if (earliest.isBefore(moment(boundsMinMs)) || latest.isAfter(moment(boundsMaxMs))) {
            const earliestMs = Math.min(earliest.valueOf(), boundsMinMs);
            const latestMs = Math.max(latest.valueOf(), boundsMaxMs);
            setGlobalState('time', {
              from: moment(earliestMs).toISOString(),
              to: moment(latestMs).toISOString(),
            });
          }
          setSelectedForecastIdProp(selectedForecastId);
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

  if (timeSeriesJobs.length === 0) {
    return (
      <TimeSeriesExplorerPage dateFormatTz={dateFormatTz}>
        <TimeseriesexplorerNoJobsFound />
      </TimeSeriesExplorerPage>
    );
  }

  if (selectedJobId === undefined || autoZoomDuration === undefined || bounds === undefined) {
    return null;
  }

  const zoomProp: AppStateZoom | undefined =
    typeof selectedForecastId === 'string' && selectedForecastIdProp === undefined
      ? undefined
      : zoom;

  return (
    <TimeSeriesExplorer
      {...{
        appStateHandler,
        autoZoomDuration,
        bounds,
        dateFormatTz,
        lastRefresh,
        previousRefresh,
        selectedJobId,
        selectedDetectorIndex,
        selectedEntities,
        selectedForecastId: selectedForecastIdProp,
        tableInterval: tableInterval.val,
        tableSeverity: tableSeverity.val,
        timefilter,
        zoom: zoomProp,
      }}
    />
  );
};
