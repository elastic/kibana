/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React, { FC, useEffect } from 'react';
import { useObservable } from 'react-use';
import { merge, Subscription } from 'rxjs';

import { i18n } from '@kbn/i18n';

import { timefilter } from 'ui/timefilter';

import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { Explorer } from '../../explorer';
import { useSelectedCells } from '../../explorer/hooks/use_selected_cells';
import { annotationsRefresh$ } from '../../services/annotations_service';
import { mlJobService } from '../../services/job_service';
import { mlTimefilterRefresh$ } from '../../services/timefilter_refresh_service';
import { useExplorerData } from '../../explorer/actions';
import { explorerService } from '../../explorer/explorer_dashboard_service';
import { useJobSelection } from '../../components/job_selector/use_job_selection';
import { useUrlState } from '../../util/url_state';
import { useShowCharts } from '../../components/controls/checkbox_showcharts';
import { useTableInterval } from '../../components/controls/select_interval';
import { useTableSeverity } from '../../components/controls/select_severity';
import { ANOMALY_DETECTION_BREADCRUMB, ML_BREADCRUMB } from '../breadcrumbs';

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
  render: (props, config, deps) => <PageWrapper config={config} {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ config, deps }) => {
  const { context } = useResolver(undefined, undefined, config, {
    ...basicResolvers(deps),
    jobs: mlJobService.loadJobsWrapper,
  });

  return (
    <PageLoader context={context}>
      <ExplorerUrlStateManager />
    </PageLoader>
  );
};

const ExplorerUrlStateManager: FC = () => {
  const [, setAppState] = useUrlState('_a');
  const [globalState] = useUrlState('_g');

  const { jobIds } = useJobSelection();
  jobIds.sort();

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
      explorerService.setBounds({
        min: moment(globalState.time.from),
        max: moment(globalState.time.to),
      });
    }
  }, [JSON.stringify(globalState?.time)]);

  useEffect(() => {
    if (jobIds.length > 0) {
      explorerService.updateJobSelection(jobIds);
    } else {
      explorerService.clearJobs();
    }
  }, [JSON.stringify(jobIds)]);

  useEffect(() => {
    const subscriptions = new Subscription();

    // Refresh all the data when the time range is altered.
    subscriptions.add(
      merge(mlTimefilterRefresh$, timefilter.getFetch$()).subscribe(() => {
        const activeBounds = timefilter.getActiveBounds();
        if (activeBounds !== undefined) {
          explorerService.setBounds(activeBounds);
        }
      })
    );

    return () => {
      subscriptions.unsubscribe();
    };
  }, []);

  const [explorerData, loadExplorerData] = useExplorerData();
  useEffect(() => {
    if (explorerData !== undefined && Object.keys(explorerData).length > 0) {
      explorerService.setExplorerData(explorerData);
    }
  }, [JSON.stringify(explorerData)]);

  const explorerAppState = useObservable(explorerService.appState$);
  useEffect(() => {
    if (
      explorerAppState !== undefined &&
      explorerAppState.mlExplorerSwimlane.viewByFieldName !== undefined
    ) {
      setAppState(explorerAppState);
    }
  }, [JSON.stringify(explorerAppState)]);

  const annotationsRefresh = useObservable(annotationsRefresh$);
  const explorerState = useObservable(explorerService.state$);

  const [showCharts] = useShowCharts();
  const [tableInterval] = useTableInterval();
  const [tableSeverity] = useTableSeverity();

  const [selectedCells, setSelectedCells] = useSelectedCells();
  useEffect(() => {
    explorerService.setSelectedCells(selectedCells);
  }, [JSON.stringify(selectedCells)]);

  const loadExplorerDataConfig =
    (explorerState !== undefined && {
      bounds: explorerState.bounds,
      influencersFilterQuery: explorerState.influencersFilterQuery,
      noInfluencersConfigured: explorerState.noInfluencersConfigured,
      selectedCells,
      selectedJobs: explorerState.selectedJobs,
      swimlaneBucketInterval: explorerState.swimlaneBucketInterval,
      swimlaneLimit: explorerState.swimlaneLimit,
      tableInterval,
      tableSeverity: tableSeverity.val,
      viewBySwimlaneFieldName: explorerState.viewBySwimlaneFieldName,
    }) ||
    undefined;
  useEffect(() => {
    loadExplorerData(loadExplorerDataConfig);
  }, [JSON.stringify(loadExplorerDataConfig)]);

  if (annotationsRefresh === undefined || explorerState === undefined || showCharts === undefined) {
    return null;
  }

  return (
    <div className="ml-explorer">
      <Explorer
        {...{
          annotationsRefresh,
          explorerState,
          setSelectedCells,
          showCharts,
        }}
      />
    </div>
  );
};
