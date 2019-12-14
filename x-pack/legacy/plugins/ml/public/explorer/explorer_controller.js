/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Angular controller for the Machine Learning Explorer dashboard. The controller makes
 * multiple queries to Elasticsearch to obtain the data to populate all the components
 * in the view.
 */

import $ from 'jquery';
import { Subscription } from 'rxjs';

import '../components/controls';

import uiRoutes from 'ui/routes';
import { createJobs } from './explorer_utils';
import { getAnomalyExplorerBreadcrumbs } from './breadcrumbs';
import { checkFullLicense } from '../license/check_license';
import { checkGetJobsPrivilege } from '../privilege/check_privilege';
import { getIndexPatterns, loadIndexPatterns } from '../util/index_utils';
import { TimeBuckets } from 'plugins/ml/util/time_buckets';
import { explorer$ } from './explorer_dashboard_service';
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';
import { mlFieldFormatService } from 'plugins/ml/services/field_format_service';
import { mlJobService } from '../services/job_service';
import {
  getSelectedJobIds,
  jobSelectServiceFactory,
} from '../components/job_selector/job_select_service_utils';
import { timefilter } from 'ui/timefilter';

import { interval$ } from '../components/controls/select_interval';
import { severity$ } from '../components/controls/select_severity';
import { showCharts$ } from '../components/controls/checkbox_showcharts';
import { subscribeAppStateToObservable } from '../util/app_state_utils';

import { APP_STATE_ACTION, EXPLORER_ACTION } from './explorer_constants';

const template = `<ml-explorer-react-wrapper class="ml-explorer" data-test-subj="mlPageAnomalyExplorer" />`;

uiRoutes.when('/explorer/?', {
  controller: 'MlExplorerController',
  template,
  k7Breadcrumbs: getAnomalyExplorerBreadcrumbs,
  resolve: {
    CheckLicense: checkFullLicense,
    privileges: checkGetJobsPrivilege,
    indexPatterns: loadIndexPatterns,
    jobs: mlJobService.loadJobsWrapper,
  },
});

import { uiModules } from 'ui/modules';

const module = uiModules.get('apps/ml');

module.controller('MlExplorerController', function(
  $scope,
  $timeout,
  $rootScope,
  AppState,
  globalState
) {
  const { jobSelectService, unsubscribeFromGlobalState } = jobSelectServiceFactory(globalState);
  const subscriptions = new Subscription();

  // $scope should only contain what's actually still necessary for the angular part.
  // For the moment that's the job selector and the (hidden) filter bar.
  $scope.jobs = [];
  timefilter.enableTimeRangeSelector();
  timefilter.enableAutoRefreshSelector();

  $scope.TimeBuckets = TimeBuckets;

  let resizeTimeout = null;

  function jobSelectionUpdate(
    action,
    { fullJobs, filterData, selectedCells, selectedJobIds, swimlaneViewByFieldName }
  ) {
    const jobs = createJobs(fullJobs).map(job => {
      job.selected = selectedJobIds.some(id => job.id === id);
      return job;
    });

    const selectedJobs = jobs.filter(job => job.selected);

    function fieldFormatServiceCallback() {
      $scope.jobs = jobs;
      $scope.$applyAsync();

      const noJobsFound = $scope.jobs.length === 0;

      explorer$.next({
        action,
        payload: {
          loading: false,
          noJobsFound,
          selectedCells,
          selectedJobs,
          swimlaneViewByFieldName,
          filterData,
        },
      });
      $scope.jobSelectionUpdateInProgress = false;
      $scope.$applyAsync();
    }

    // Populate the map of jobs / detectors / field formatters for the selected IDs.
    mlFieldFormatService
      .populateFormats(selectedJobIds, getIndexPatterns())
      .catch(err => {
        console.log('Error populating field formats:', err);
      })
      .then(() => {
        fieldFormatServiceCallback();
      });
  }

  // Initialize the AppState in which to store swimlane settings.
  // AppState is used to store state in the URL.
  $scope.appState = new AppState({
    mlExplorerSwimlane: {},
    mlExplorerFilter: {},
  });

  // Load the job info needed by the dashboard, then do the first load.
  // Calling loadJobs() ensures the full datafeed config is available for building the charts.
  // Using this listener ensures the jobs will only be loaded and passed on after
  // <ml-explorer-react-wrapper /> and <Explorer /> have been initialized.
  function loadJobsListener({ action }) {
    if (action === EXPLORER_ACTION.LOAD_JOBS) {
      // Jobs load via route resolver
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

        jobSelectionUpdate(EXPLORER_ACTION.INITIALIZE, {
          filterData,
          fullJobs: mlJobService.jobs,
          selectedCells,
          selectedJobIds,
          swimlaneViewByFieldName: $scope.appState.mlExplorerSwimlane.viewByFieldName,
        });

        subscriptions.add(
          jobSelectService.subscribe(({ selection }) => {
            if (selection !== undefined) {
              $scope.jobSelectionUpdateInProgress = true;
              jobSelectionUpdate(EXPLORER_ACTION.JOB_SELECTION_CHANGE, {
                fullJobs: mlJobService.jobs,
                selectedJobIds: selection,
              });
            }
          })
        );
      } else {
        explorer$.next({
          action: EXPLORER_ACTION.RELOAD,
          payload: {
            loading: false,
            noJobsFound: true,
          },
        });
      }
    }
  }

  subscriptions.add(explorer$.subscribe(loadJobsListener));

  // Listen for changes to job selection.
  $scope.jobSelectionUpdateInProgress = false;

  subscriptions.add(
    mlTimefilterRefresh$.subscribe(() => {
      if ($scope.jobSelectionUpdateInProgress === false) {
        explorer$.next({ action: EXPLORER_ACTION.REDRAW });
      }
    })
  );

  // Refresh all the data when the time range is altered.
  subscriptions.add(
    timefilter.getFetch$().subscribe(() => {
      if ($scope.jobSelectionUpdateInProgress === false) {
        explorer$.next({ action: EXPLORER_ACTION.RELOAD });
      }
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

  // Redraw the swimlane when the window resizes or the global nav is toggled.
  function jqueryRedrawOnResize() {
    if (resizeTimeout !== null) {
      $timeout.cancel(resizeTimeout);
    }
    // Only redraw 100ms after last resize event.
    resizeTimeout = $timeout(redrawOnResize, 100);
  }

  $(window).resize(jqueryRedrawOnResize);

  const navListener = $scope.$on('globalNav:update', () => {
    // Run in timeout so that content pane has resized after global nav has updated.
    $timeout(() => {
      redrawOnResize();
    }, 300);
  });

  function redrawOnResize() {
    if ($scope.jobSelectionUpdateInProgress === false) {
      explorer$.next({ action: EXPLORER_ACTION.REDRAW });
    }
  }

  $scope.appStateHandler = (action, payload) => {
    $scope.appState.fetch();

    if (action === APP_STATE_ACTION.CLEAR_SELECTION) {
      delete $scope.appState.mlExplorerSwimlane.selectedType;
      delete $scope.appState.mlExplorerSwimlane.selectedLanes;
      delete $scope.appState.mlExplorerSwimlane.selectedTimes;
      delete $scope.appState.mlExplorerSwimlane.showTopFieldValues;
    }

    if (action === APP_STATE_ACTION.SAVE_SELECTION) {
      const swimlaneSelectedCells = payload.swimlaneSelectedCells;
      $scope.appState.mlExplorerSwimlane.selectedType = swimlaneSelectedCells.type;
      $scope.appState.mlExplorerSwimlane.selectedLanes = swimlaneSelectedCells.lanes;
      $scope.appState.mlExplorerSwimlane.selectedTimes = swimlaneSelectedCells.times;
      $scope.appState.mlExplorerSwimlane.showTopFieldValues =
        swimlaneSelectedCells.showTopFieldValues;
      $scope.appState.mlExplorerSwimlane.viewByFieldName = swimlaneSelectedCells.viewByFieldName;
    }

    if (action === APP_STATE_ACTION.SAVE_SWIMLANE_VIEW_BY_FIELD_NAME) {
      $scope.appState.mlExplorerSwimlane.viewByFieldName = payload.swimlaneViewByFieldName;
    }

    if (action === APP_STATE_ACTION.SAVE_INFLUENCER_FILTER_SETTINGS) {
      $scope.appState.mlExplorerFilter.influencersFilterQuery = payload.influencersFilterQuery;
      $scope.appState.mlExplorerFilter.filterActive = payload.filterActive;
      $scope.appState.mlExplorerFilter.filteredFields = payload.filteredFields;
      $scope.appState.mlExplorerFilter.queryString = payload.queryString;
    }

    if (action === APP_STATE_ACTION.CLEAR_INFLUENCER_FILTER_SETTINGS) {
      delete $scope.appState.mlExplorerFilter.influencersFilterQuery;
      delete $scope.appState.mlExplorerFilter.filterActive;
      delete $scope.appState.mlExplorerFilter.filteredFields;
      delete $scope.appState.mlExplorerFilter.queryString;
    }

    $scope.appState.save();
    $scope.$applyAsync();
  };

  $scope.$on('$destroy', () => {
    subscriptions.unsubscribe();
    $(window).off('resize', jqueryRedrawOnResize);
    // Cancel listening for updates to the global nav state.
    navListener();
    unsubscribeFromGlobalState();
  });
});
