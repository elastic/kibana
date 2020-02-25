/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { i18n } from '@kbn/i18n';

import { MlJobWithTimeRange } from '../../../../common/types/jobs';

import { MlRoute, PageLoader, PageProps } from '../router';
import { useRefresh } from '../use_refresh';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { Explorer } from '../../explorer';
import { useSelectedCells } from '../../explorer/hooks/use_selected_cells';
import { mlJobService } from '../../services/job_service';
import { ml } from '../../services/ml_api_service';
import { useExplorerData } from '../../explorer/actions';
import { explorerService } from '../../explorer/explorer_dashboard_service';
import { getDateFormatTz } from '../../explorer/explorer_utils';
import { useSwimlaneLimit } from '../../explorer/select_limit';
import { useJobSelection } from '../../components/job_selector/use_job_selection';
import { useShowCharts } from '../../components/controls/checkbox_showcharts';
import { useTableInterval } from '../../components/controls/select_interval';
import { useTableSeverity } from '../../components/controls/select_severity';
import { useUrlState } from '../../util/url_state';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../breadcrumbs';
import { useTimefilter } from '../../contexts/kibana';

const breadcrumbs = [
  ML_BREADCRUMB,
  ANOMALY_DETECTION_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.anomalyDetection.anomalyExplorerLabel', {
      defaultMessage: 'Anomaly Explorer',
    }),
    href: '',
  },
];

export const explorerRoute: MlRoute = {
  path: '/explorer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ deps }) => {
  const { context, results } = useResolver(undefined, undefined, deps.config, {
    ...basicResolvers(deps),
    jobs: mlJobService.loadJobsWrapper,
    jobsWithTimeRange: () => ml.jobs.jobsWithTimerange(getDateFormatTz()),
  });

  return (
    <PageLoader context={context}>
      <ExplorerUrlStateManager jobsWithTimeRange={results.jobsWithTimeRange.jobs} />
    </PageLoader>
  );
};

interface ExplorerUrlStateManagerProps {
  jobsWithTimeRange: MlJobWithTimeRange[];
}

const ExplorerUrlStateManager: FC<ExplorerUrlStateManagerProps> = ({ jobsWithTimeRange }) => {
  const [appState, setAppState] = useUrlState('_a');
  const [globalState, setGlobalState] = useUrlState('_g');
  const [lastRefresh, setLastRefresh] = useState(0);
  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

  const { jobIds } = useJobSelection(jobsWithTimeRange, getDateFormatTz());

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
        explorerService.setBounds(timefilterBounds);
      }
    }
  }, [globalState?.time?.from, globalState?.time?.to]);

  useEffect(() => {
    const viewByFieldName = appState?.mlExplorerSwimlane?.viewByFieldName;
    if (viewByFieldName !== undefined) {
      explorerService.setViewBySwimlaneFieldName(viewByFieldName);
    }

    const filterData = appState?.mlExplorerFilter;
    if (filterData !== undefined) {
      explorerService.setFilterData(filterData);
    }
  }, []);

  useEffect(() => {
    if (jobIds.length > 0) {
      explorerService.updateJobSelection(jobIds);
    } else {
      explorerService.clearJobs();
    }
  }, [JSON.stringify(jobIds)]);

  const [explorerData, loadExplorerData] = useExplorerData();
  useEffect(() => {
    if (explorerData !== undefined && Object.keys(explorerData).length > 0) {
      explorerService.setExplorerData(explorerData);
    }
  }, [explorerData]);

  const explorerAppState = useObservable(explorerService.appState$);
  useEffect(() => {
    if (
      explorerAppState !== undefined &&
      explorerAppState.mlExplorerSwimlane.viewByFieldName !== undefined
    ) {
      setAppState(explorerAppState);
    }
  }, [explorerAppState]);

  const explorerState = useObservable(explorerService.state$);

  const [showCharts] = useShowCharts();
  const [tableInterval] = useTableInterval();
  const [tableSeverity] = useTableSeverity();
  const [swimlaneLimit] = useSwimlaneLimit();
  useEffect(() => {
    explorerService.setSwimlaneLimit(swimlaneLimit);
  }, [swimlaneLimit]);

  const [selectedCells, setSelectedCells] = useSelectedCells();
  useEffect(() => {
    explorerService.setSelectedCells(selectedCells);
  }, [JSON.stringify(selectedCells)]);

  const loadExplorerDataConfig =
    (explorerState !== undefined && {
      bounds: explorerState.bounds,
      lastRefresh,
      influencersFilterQuery: explorerState.influencersFilterQuery,
      noInfluencersConfigured: explorerState.noInfluencersConfigured,
      selectedCells,
      selectedJobs: explorerState.selectedJobs,
      swimlaneBucketInterval: explorerState.swimlaneBucketInterval,
      swimlaneLimit: explorerState.swimlaneLimit,
      tableInterval: tableInterval.val,
      tableSeverity: tableSeverity.val,
      viewBySwimlaneFieldName: explorerState.viewBySwimlaneFieldName,
    }) ||
    undefined;
  useEffect(() => {
    loadExplorerData(loadExplorerDataConfig);
  }, [JSON.stringify(loadExplorerDataConfig)]);

  if (explorerState === undefined || refresh === undefined || showCharts === undefined) {
    return null;
  }

  return (
    <div className="ml-explorer">
      <Explorer
        {...{
          explorerState,
          setSelectedCells,
          showCharts,
          severity: tableSeverity.val,
        }}
      />
    </div>
  );
};
