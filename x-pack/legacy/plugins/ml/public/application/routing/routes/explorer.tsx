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
import { annotationsRefresh$ } from '../../services/annotations_service';
import { mlJobService } from '../../services/job_service';
import { mlTimefilterRefresh$ } from '../../services/timefilter_refresh_service';
import { ExplorerAppState } from '../../explorer/reducers';
import { explorerService } from '../../explorer/explorer_dashboard_service';
import { restoreAppState } from '../../explorer/explorer_utils';
import { useJobSelection } from '../../components/job_selector/use_job_selection';
import { useUrlState } from '../../util/url_state';

import { useTableInterval } from '../../components/controls/select_interval';
import { useTableSeverity } from '../../components/controls/select_severity';
import { SHOW_CHARTS_DEFAULT } from '../../components/controls/checkbox_showcharts';
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
  const [appState, setAppState] = useUrlState('_a');
  const [globalState] = useUrlState('_g');

  const jobSelection = useJobSelection();

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
  }, [globalState?.time?.from, globalState?.time?.to]);

  useEffect(() => {
    if (jobSelection.jobIds.length > 0) {
      explorerService.updateJobSelection(jobSelection.jobIds, restoreAppState(appState));
    } else {
      explorerService.clearJobs();
    }
  }, [jobSelection.jobIds]);

  useEffect(() => {
    const subscriptions = new Subscription();

    // Pass the current URL AppState on to anomaly explorer's reactive state.
    // After this hand-off, the appState stored in explorerState$ is the single
    // source of truth.
    explorerService.setAppState({
      mlExplorerSwimlane: appState?.mlExplorerSwimlane || {},
      mlExplorerFilter: appState?.mlExplorerFilter || {},
    });

    // Now that appState in explorerState$ is the single source of truth,
    // subscribe to it and update the actual URL appState on changes.
    subscriptions.add(
      explorerService.appState$.subscribe((appStateIn: ExplorerAppState) => {
        setAppState(appStateIn);
      })
    );

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

  const annotationsRefresh = useObservable(annotationsRefresh$);
  const explorerState = useObservable(explorerService.state$);
  const showCharts = appState?.mlShowCharts || SHOW_CHARTS_DEFAULT;

  const [tableInterval] = useTableInterval();
  const [tableSeverity] = useTableSeverity();
  useEffect(() => {
    explorerService.setState({
      tableInterval,
      tableSeverity: tableSeverity.val,
    });
  }, [tableInterval, tableSeverity.val]);

  if (annotationsRefresh === undefined || explorerState === undefined || showCharts === undefined) {
    return null;
  }

  return (
    <div className="ml-explorer">
      <Explorer
        {...{
          annotationsRefresh,
          explorerState,
          jobSelection,
          showCharts,
        }}
      />
    </div>
  );
};
