/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * AngularJS directive wrapper for rendering Anomaly Explorer's React component.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { Subscription } from 'rxjs';

import { IRootElementService, IRootScopeService, IScope } from 'angular';

// @ts-ignore
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { I18nContext } from 'ui/i18n';
import { State } from 'ui/state_management/state';
import { AppState as IAppState, AppStateClass } from 'ui/state_management/app_state';

import { jobSelectServiceFactory } from '../components/job_selector/job_select_service_utils';

import { interval$ } from '../components/controls/select_interval';
import { severity$ } from '../components/controls/select_severity';
import { showCharts$ } from '../components/controls/checkbox_showcharts';
import { subscribeAppStateToObservable } from '../util/app_state_utils';

import { Explorer } from './explorer';
import { explorerService } from './explorer_dashboard_service';
import { getExplorerDefaultAppState, ExplorerAppState } from './reducers';

interface ExplorerScope extends IScope {
  appState: IAppState;
}

module.directive('mlAnomalyExplorer', function(
  globalState: State,
  $rootScope: IRootScopeService,
  AppState: AppStateClass
) {
  function link($scope: ExplorerScope, element: IRootElementService) {
    const subscriptions = new Subscription();

    const { jobSelectService$, unsubscribeFromGlobalState } = jobSelectServiceFactory(globalState);

    ReactDOM.render(
      <I18nContext>
        <Explorer
          {...{
            globalState,
            jobSelectService$,
          }}
        />
      </I18nContext>,
      element[0]
    );

    // Initialize the AppState in which to store swimlane and filter settings.
    // AppState is used to store state in the URL.
    $scope.appState = new AppState(getExplorerDefaultAppState());
    const { mlExplorerFilter, mlExplorerSwimlane } = $scope.appState;

    // Pass the current URL AppState on to anomaly explorer's reactive state.
    // After this hand-off, the appState stored in explorerState$ is the single
    // source of truth.
    explorerService.setAppState({ mlExplorerSwimlane, mlExplorerFilter });

    // Now that appState in explorerState$ is the single source of truth,
    // subscribe to it and update the actual URL appState on changes.
    subscriptions.add(
      explorerService.appState$.subscribe((appState: ExplorerAppState) => {
        $scope.appState.fetch();
        $scope.appState.mlExplorerFilter = appState.mlExplorerFilter;
        $scope.appState.mlExplorerSwimlane = appState.mlExplorerSwimlane;
        $scope.appState.save();
        $scope.$applyAsync();
      })
    );

    subscriptions.add(
      subscribeAppStateToObservable(AppState, 'mlShowCharts', showCharts$, () =>
        $rootScope.$applyAsync()
      )
    );
    subscriptions.add(
      subscribeAppStateToObservable(AppState, 'mlSelectInterval', interval$, () =>
        $rootScope.$applyAsync()
      )
    );
    subscriptions.add(
      subscribeAppStateToObservable(AppState, 'mlSelectSeverity', severity$, () =>
        $rootScope.$applyAsync()
      )
    );

    element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(element[0]);
      $scope.$destroy();
      subscriptions.unsubscribe();
      unsubscribeFromGlobalState();
    });
  }

  return { link };
});
