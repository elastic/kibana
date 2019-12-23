/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect } from 'react';
import { useObservable } from 'react-use';
import { Subscription } from 'rxjs';

import { i18n } from '@kbn/i18n';

import { timefilter } from 'ui/timefilter';
import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { Explorer } from '../../explorer';
import { annotationsRefresh$ } from '../../services/annotations_service';
import { mlJobService } from '../../services/job_service';
import { ExplorerAppState } from '../../explorer/reducers';
import { explorerService } from '../../explorer/explorer_dashboard_service';
import { restoreAppState } from '../../explorer/explorer_utils';
import { getJobSelectService$ } from '../../components/job_selector/job_select_service_utils';
import { useJobSelection } from '../../components/job_selector/use_job_selection';
import { subscribeAppStateToObservable } from '../../util/app_state_utils';
import { useUrlState } from '../../util/url_state';

import { interval$ } from '../../components/controls/select_interval';
import { severity$ } from '../../components/controls/select_severity';
import { showCharts$, SHOW_CHARTS_DEFAULT } from '../../components/controls/checkbox_showcharts';
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

  const jobSelectService$ = getJobSelectService$(globalState);
  const jobSelection = useJobSelection();

  useEffect(() => {
    if (globalState?.time) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
  }, [globalState]);

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

    // restore state stored in URL via AppState and subscribe to
    // job updates via job selector.
    if (mlJobService.jobs.length > 0) {
      let initialized = false;

      subscriptions.add(
        jobSelectService$.subscribe(({ selection }) => {
          if (selection !== undefined) {
            if (!initialized) {
              explorerService.initialize(selection, restoreAppState(appState));
              initialized = true;
            } else {
              explorerService.updateJobSelection(selection, restoreAppState(appState));
            }
          }
        })
      );
    } else {
      explorerService.clearJobs();
    }

    subscriptions.add(
      subscribeAppStateToObservable(appState, setAppState, 'mlShowCharts', showCharts$)
    );
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

  const annotationsRefresh = useObservable(annotationsRefresh$);
  const explorerState = useObservable(explorerService.state$);
  const showCharts = useObservable(showCharts$, SHOW_CHARTS_DEFAULT);

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
          jobSelectService$,
          showCharts,
        }}
      />
    </div>
  );
};
