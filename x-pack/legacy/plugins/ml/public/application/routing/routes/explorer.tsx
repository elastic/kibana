/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { decode } from 'rison-node';
import { Subscription } from 'rxjs';

// @ts-ignore
import queryString from 'query-string';
import { timefilter } from 'ui/timefilter';
import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { Explorer } from '../../explorer';
import { mlJobService } from '../../services/job_service';
import { getExplorerDefaultAppState, ExplorerAppState } from '../../explorer/reducers';
import { explorerService } from '../../explorer/explorer_dashboard_service';
import { jobSelectServiceFactory } from '../../components/job_selector/job_select_service_utils';
import { subscribeAppStateToObservable } from '../../util/app_state_utils';

import { interval$ } from '../../components/controls/select_interval';
import { severity$ } from '../../components/controls/select_severity';
import { showCharts$ } from '../../components/controls/checkbox_showcharts';
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

const PageWrapper: FC<PageProps> = ({ location, config, deps }) => {
  const { index } = queryString.parse(location.search);
  const { context } = useResolver(index, undefined, config, {
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

  if (appState.mlExplorerSwimlane === undefined) {
    appState.mlExplorerSwimlane = {};
  }

  if (appState.mlExplorerFilter === undefined) {
    appState.mlExplorerFilter = {};
  }

  appState.fetch = () => {};
  appState.on = () => {};
  appState.off = () => {};
  appState.save = () => {};
  globalState.fetch = () => {};
  globalState.on = () => {};
  globalState.off = () => {};
  globalState.save = () => {};

  return (
    <PageLoader context={context}>
      <ExplorerWrapper
        {...{
          globalState,
          appState,
        }}
      />
    </PageLoader>
  );
};

class AppState {
  fetch() {}
  on() {}
  off() {}
  save() {}
}

const ExplorerWrapper: FC<{ globalState: any; appState: any }> = ({ globalState, appState }) => {
  const subscriptions = new Subscription();

  const { jobSelectService$, unsubscribeFromGlobalState } = jobSelectServiceFactory(globalState);
  appState = getExplorerDefaultAppState();
  const { mlExplorerFilter, mlExplorerSwimlane } = appState;
  window.setTimeout(() => {
    // Pass the current URL AppState on to anomaly explorer's reactive state.
    // After this hand-off, the appState stored in explorerState$ is the single
    // source of truth.
    explorerService.setAppState({ mlExplorerSwimlane, mlExplorerFilter });

    // Now that appState in explorerState$ is the single source of truth,
    // subscribe to it and update the actual URL appState on changes.
    subscriptions.add(
      explorerService.appState$.subscribe((appStateIn: ExplorerAppState) => {
        // appState.fetch();
        appState.mlExplorerFilter = appStateIn.mlExplorerFilter;
        appState.mlExplorerSwimlane = appStateIn.mlExplorerSwimlane;
        // appState.save();
      })
    );
  });

  subscriptions.add(subscribeAppStateToObservable(AppState, 'mlShowCharts', showCharts$, () => {}));
  subscriptions.add(
    subscribeAppStateToObservable(AppState, 'mlSelectInterval', interval$, () => {})
  );
  subscriptions.add(
    subscribeAppStateToObservable(AppState, 'mlSelectSeverity', severity$, () => {})
  );

  if (globalState.time) {
    timefilter.setTime({
      from: globalState.time.from,
      to: globalState.time.to,
    });
  }

  useEffect(() => {
    return () => {
      subscriptions.unsubscribe();
      unsubscribeFromGlobalState();
    };
  });

  return (
    <div className="ml-explorer">
      <Explorer
        {...{
          globalState,
          jobSelectService$,
        }}
      />
    </div>
  );
};
