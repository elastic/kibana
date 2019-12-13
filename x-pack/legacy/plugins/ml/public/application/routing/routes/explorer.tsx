/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { Subscription } from 'rxjs';

import { timefilter } from 'ui/timefilter';
import { MlRoute, PageLoader, PageProps } from '../router';
import { useResolver } from '../use_resolver';
import { basicResolvers } from '../resolvers';
import { Explorer } from '../../explorer';
import { mlJobService } from '../../services/job_service';
import { ExplorerAppState } from '../../explorer/reducers';
import { explorerService } from '../../explorer/explorer_dashboard_service';
import { jobSelectServiceFactory } from '../../components/job_selector/job_select_service_utils';
import { subscribeAppStateToObservable } from '../../util/app_state_utils';
import { useUrlState } from '../../util/url_state';

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
  const { context } = useResolver(undefined, undefined, config, {
    ...basicResolvers(deps),
    jobs: mlJobService.loadJobsWrapper,
  });

  const appState = useUrlState('_a');
  const globalState = useUrlState('_g');

  if (appState.get('mlExplorerSwimlane') === undefined) {
    appState.set('mlExplorerSwimlane', {});
  }

  if (appState.get('mlExplorerFilter') === undefined) {
    appState.set('mlExplorerFilter', {});
  }

  appState.save();

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

const ExplorerWrapper: FC<{ globalState: any; appState: any }> = ({ globalState, appState }) => {
  const { jobSelectService$, unsubscribeFromGlobalState } = jobSelectServiceFactory(globalState);

  useEffect(() => {
    const subscriptions = new Subscription();

    const globalStateTime = globalState.get('time');
    if (globalStateTime) {
      timefilter.setTime({
        from: globalStateTime.from,
        to: globalStateTime.to,
      });
    }

    // Pass the current URL AppState on to anomaly explorer's reactive state.
    // After this hand-off, the appState stored in explorerState$ is the single
    // source of truth.
    const mlExplorerFilter = appState.get('mlExplorerFilter');
    const mlExplorerSwimlane = appState.get('mlExplorerSwimlane');
    explorerService.setAppState({ mlExplorerSwimlane, mlExplorerFilter });

    // Now that appState in explorerState$ is the single source of truth,
    // subscribe to it and update the actual URL appState on changes.
    subscriptions.add(
      explorerService.appState$.subscribe((appStateIn: ExplorerAppState) => {
        appState.fetch();
        appState.set('mlExplorerFilter', appStateIn.mlExplorerFilter);
        appState.set('mlExplorerSwimlane', appStateIn.mlExplorerSwimlane);
        appState.save();
      })
    );

    subscriptions.add(
      subscribeAppStateToObservable(appState, 'mlShowCharts', showCharts$, () => {})
    );
    subscriptions.add(
      subscribeAppStateToObservable(appState, 'mlSelectInterval', interval$, () => {})
    );
    subscriptions.add(
      subscribeAppStateToObservable(appState, 'mlSelectSeverity', severity$, () => {})
    );

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
