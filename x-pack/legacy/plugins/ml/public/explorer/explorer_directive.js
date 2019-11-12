/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * AngularJS directive wrapper for rendering Anomaly Explorer's React component.
 */

import { isEqual, merge } from 'lodash';

import React from 'react';
import ReactDOM from 'react-dom';

import moment from 'moment-timezone';

import { from, of, Subscription } from 'rxjs';
import { catchError, distinctUntilChanged, map } from 'rxjs/operators';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { I18nContext } from 'ui/i18n';

import { mlFieldFormatService } from 'plugins/ml/services/field_format_service';
import { TimeBuckets } from 'plugins/ml/util/time_buckets';

import { getSelectedJobIds, jobSelectServiceFactory } from '../components/job_selector/job_select_service_utils';
import { mlJobService } from '../services/job_service';

import { interval$ } from '../components/controls/select_interval';
import { severity$ } from '../components/controls/select_severity';
import { showCharts$ } from '../components/controls/checkbox_showcharts';
import { subscribeAppStateToObservable } from '../util/app_state_utils';

import { Explorer } from './explorer';
import { EXPLORER_ACTION } from './explorer_constants';
import { explorerAction$, explorerState$ } from './explorer_dashboard_service';
import { createJobs } from './explorer_utils';

module.directive('mlExplorerDirective', function (config, globalState, $rootScope, $timeout, AppState) {
  function link($scope, element) {
    const subscriptions = new Subscription();

    const { jobSelectService, unsubscribeFromGlobalState } = jobSelectServiceFactory(globalState);

    // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
    const tzConfig = config.get('dateFormat:tz');
    const dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();

    // Initialize the AppState in which to store swimlane settings.
    // AppState is used to store state in the URL.
    $scope.appState = new AppState({
      mlExplorerSwimlane: {},
      mlExplorerFilter: {}
    });

    subscriptions.add(
      explorerState$.pipe(
        map(state => state.appState),
        distinctUntilChanged(isEqual),
      ).subscribe(appState => {
        $scope.appState.fetch();
        $scope.appState = merge($scope.appState, appState);
        $scope.appState.save();
        $scope.$applyAsync();
      })
    );

    subscriptions.add(subscribeAppStateToObservable(AppState, 'mlShowCharts', showCharts$, () => $rootScope.$applyAsync()));
    subscriptions.add(subscribeAppStateToObservable(AppState, 'mlSelectInterval', interval$, () => $rootScope.$applyAsync()));
    subscriptions.add(subscribeAppStateToObservable(AppState, 'mlSelectSeverity', severity$, () => $rootScope.$applyAsync()));

    ReactDOM.render(
      <I18nContext>
        <Explorer {...{
          componentDidMountCallback,
          dateFormatTz,
          globalState,
          jobSelectService,
          TimeBuckets,
        }}
        />
      </I18nContext>,
      element[0]
    );

    // Listen for changes to job selection.
    $scope.jobSelectionUpdateInProgress = false;

    // Load the job info needed by the dashboard, then do the first load.
    // Jobs load via route resolver
    function componentDidMountCallback() {
      if (mlJobService.jobs.length > 0) {
      // Select any jobs set in the global state (i.e. passed in the URL).
        const { jobIds: selectedJobIds } = getSelectedJobIds(globalState);
        let selectedCells;
        let filterData = {};

        // keep swimlane selection, restore selectedCells from AppState
        if ($scope.appState.mlExplorerSwimlane.selectedType !== undefined) {
          selectedCells = {
            type: $scope.appState.mlExplorerSwimlane.selectedType,
            lanes: $scope.appState.mlExplorerSwimlane.selectedLanes,
            times: $scope.appState.mlExplorerSwimlane.selectedTimes,
            showTopFieldValues: $scope.appState.mlExplorerSwimlane.showTopFieldValues,
            viewByFieldName: $scope.appState.mlExplorerSwimlane.viewByFieldName,
          };
        }

        // keep influencers filter selection, restore from AppState
        if ($scope.appState.mlExplorerFilter.influencersFilterQuery !== undefined) {
          filterData = {
            influencersFilterQuery: $scope.appState.mlExplorerFilter.influencersFilterQuery,
            filterActive: $scope.appState.mlExplorerFilter.filterActive,
            filteredFields: $scope.appState.mlExplorerFilter.filteredFields,
            queryString: $scope.appState.mlExplorerFilter.queryString,
          };
        }

        function jobSelectionActionCreator(actionName) {
          return from(mlFieldFormatService.populateFormats(selectedJobIds)).pipe(
            catchError(error => of({ error })),
            map(resp => {
              if (resp.error) {
                console.log('Error populating field formats:', resp.error);
                return { action: EXPLORER_ACTION.FIELD_FORMATS_LOADED };
              }

              const jobs = createJobs(mlJobService.jobs).map((job) => {
                job.selected = selectedJobIds.some((id) => job.id === id);
                return job;
              });

              const selectedJobs = jobs.filter(job => job.selected);

              const noJobsFound = (jobs.length === 0);

              const payload = from([{
                action: actionName,
                payload: {
                  loading: false,
                  noJobsFound,
                  selectedCells,
                  selectedJobs,
                  swimlaneViewByFieldName: $scope.appState.mlExplorerSwimlane.viewByFieldName,
                  filterData
                }
              }]);

              return { action: EXPLORER_ACTION.FIELD_FORMATS_LOADED, payload };
            })
          );
        }

        explorerAction$.next({
          action: EXPLORER_ACTION.FIELD_FORMATS_LOADING,
          payload: jobSelectionActionCreator(EXPLORER_ACTION.INITIALIZE)
        });

        subscriptions.add(jobSelectService.subscribe(({ selection }) => {
          if (selection !== undefined) {
            $scope.jobSelectionUpdateInProgress = true;
            explorerAction$.next({
              action: EXPLORER_ACTION.FIELD_FORMATS_LOADING,
              payload: jobSelectionActionCreator(EXPLORER_ACTION.JOB_SELECTION_CHANGE)
            });
          }
        }));

      } else {
        explorerAction$.next({
          action: EXPLORER_ACTION.RELOAD,
          payload: {
            loading: false,
            noJobsFound: true,
          }
        });
      }
    }

    /*
    const navListener = $scope.$on('globalNav:update', () => {
      // Run in timeout so that content pane has resized after global nav has updated.
      $timeout(() => {
        redrawOnResize();
      }, 300);
    });

    function redrawOnResize() {
      if ($scope.jobSelectionUpdateInProgress === false) {
        explorerAction$.next({ action: EXPLORER_ACTION.REDRAW });
      }
    }
    */

    element.on('$destroy', () => {
      ReactDOM.unmountComponentAtNode(element[0]);
      $scope.$destroy();
      subscriptions.unsubscribe();
      unsubscribeFromGlobalState();
      // Cancel listening for updates to the global nav state.
      // navListener();
    });
  }

  return { link };
});
