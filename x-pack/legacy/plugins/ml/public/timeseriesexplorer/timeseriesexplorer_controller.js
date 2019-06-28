/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Angular controller for the Machine Learning Single Metric Viewer dashboard, which
 * allows the user to explore a single time series. The controller makes multiple queries
 * to Elasticsearch to obtain the data to populate all the components in the view.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';

import 'plugins/ml/components/annotations/annotation_flyout/annotation_flyout_directive';
import 'plugins/ml/components/annotations/annotations_table';
import 'plugins/ml/components/anomalies_table';
import 'plugins/ml/components/controls';

import { toastNotifications } from 'ui/notify';
import uiRoutes from 'ui/routes';
import { timefilter } from 'ui/timefilter';
import { parseInterval } from 'ui/utils/parse_interval';
import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege, checkPermission } from 'plugins/ml/privilege/check_privilege';
import {
  isTimeSeriesViewJob,
  isTimeSeriesViewDetector,
  isModelPlotEnabled,
  isSourceDataChartableForDetector,
  mlFunctionToESAggregation } from 'plugins/ml/../common/util/job_utils';
import { loadIndexPatterns, getIndexPatterns } from 'plugins/ml/util/index_utils';
import { getSingleMetricViewerBreadcrumbs } from './breadcrumbs';
import {
  createTimeSeriesJobData,
  processForecastResults,
  processDataForFocusAnomalies,
  processMetricPlotResults,
  processRecordScoreResults,
  processScheduledEventsForChart } from 'plugins/ml/timeseriesexplorer/timeseriesexplorer_utils';
import { refreshIntervalWatcher } from 'plugins/ml/util/refresh_interval_watcher';
import { MlTimeBuckets, getBoundsRoundedToInterval } from 'plugins/ml/util/ml_time_buckets';
import { mlResultsService } from 'plugins/ml/services/results_service';
import template from './timeseriesexplorer.html';
import { getMlNodeCount } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { ml } from 'plugins/ml/services/ml_api_service';
import { mlJobService } from 'plugins/ml/services/job_service';
import { mlFieldFormatService } from 'plugins/ml/services/field_format_service';
import { mlForecastService } from 'plugins/ml/services/forecast_service';
import { mlTimeSeriesSearchService } from 'plugins/ml/timeseriesexplorer/timeseries_search_service';
import {
  ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
  ANOMALIES_TABLE_DEFAULT_QUERY_SIZE
} from '../../common/constants/search';
import { annotationsRefresh$ } from '../services/annotations_service';
import { interval$ } from '../components/controls/select_interval/select_interval';
import { severity$ } from '../components/controls/select_severity/select_severity';
import { setGlobalState, getSelectedJobIds } from '../components/job_selector/job_select_service_utils';


import chrome from 'ui/chrome';
let mlAnnotationsEnabled = chrome.getInjected('mlAnnotationsEnabled', false);

uiRoutes
  .when('/timeseriesexplorer/?', {
    template,
    k7Breadcrumbs: getSingleMetricViewerBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      indexPatterns: loadIndexPatterns,
      mlNodeCount: getMlNodeCount,
      jobs: mlJobService.loadJobsWrapper
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlTimeSeriesExplorerController', function (
  $injector,
  $scope,
  $timeout,
  Private,
  AppState,
  config,
  globalState) {

  $injector.get('mlSelectIntervalService');
  $injector.get('mlSelectSeverityService');
  const mlJobSelectService = $injector.get('mlJobSelectService');

  $scope.timeFieldName = 'timestamp';
  timefilter.enableTimeRangeSelector();
  timefilter.enableAutoRefreshSelector();

  const CHARTS_POINT_TARGET = 500;
  const MAX_SCHEDULED_EVENTS = 10;          // Max number of scheduled events displayed per bucket.

  $scope.jobPickerSelections = [];
  $scope.selectedJob;
  $scope.detectors = [];
  $scope.loading = true;
  $scope.loadCounter = 0;
  $scope.hasResults = false;
  $scope.dataNotChartable = false;          // e.g. model plot with terms for a varp detector
  $scope.anomalyRecords = [];

  $scope.modelPlotEnabled = false;
  $scope.showModelBounds = true;            // Toggles display of model bounds in the focus chart
  $scope.showModelBoundsCheckbox = false;
  $scope.showAnnotations = mlAnnotationsEnabled;// Toggles display of annotations in the focus chart
  $scope.showAnnotationsCheckbox = mlAnnotationsEnabled;
  $scope.showForecast = true;               // Toggles display of forecast data in the focus chart
  $scope.showForecastCheckbox = false;

  $scope.focusAnnotationData = [];

  // Used in the template to indicate the chart is being plotted across
  // all partition field values, where the cardinality of the field cannot be
  // obtained as it is not aggregatable e.g. 'all distinct kpi_indicator values'
  $scope.allValuesLabel = i18n.translate('xpack.ml.timeSeriesExplorer.allPartitionValuesLabel', {
    defaultMessage: 'all',
  });

  // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
  const tzConfig = config.get('dateFormat:tz');
  const dateFormatTz = (tzConfig !== 'Browser') ? tzConfig : moment.tz.guess();

  $scope.permissions = {
    canForecastJob: checkPermission('canForecastJob')
  };

  $scope.initializeVis = function () {
    // Initialize the AppState in which to store the zoom range.
    const stateDefaults = {
      mlTimeSeriesExplorer: {}
    };
    $scope.appState = new AppState(stateDefaults);

    $scope.jobs = [];

    // Get the job info needed by the visualization, then do the first load.
    if (mlJobService.jobs.length > 0) {
      $scope.jobs = createTimeSeriesJobData(mlJobService.jobs);
      const timeSeriesJobIds = $scope.jobs.map(j => j.id);

      // Select any jobs set in the global state (i.e. passed in the URL).
      let { jobIds: selectedJobIds } = getSelectedJobIds(globalState);

      // Check if any of the jobs set in the URL are not time series jobs
      // (e.g. if switching to this view straight from the Anomaly Explorer).
      const invalidIds = _.difference(selectedJobIds, timeSeriesJobIds);
      selectedJobIds = _.without(selectedJobIds, ...invalidIds);
      if (invalidIds.length > 0) {
        let warningText = i18n.translate('xpack.ml.timeSeriesExplorer.canNotViewRequestedJobsWarningMessage', {
          defaultMessage: `You can't view requested {invalidIdsCount, plural, one {job} other {jobs}} {invalidIds} in this dashboard`,
          values: {
            invalidIdsCount: invalidIds.length,
            invalidIds
          }
        });
        if (selectedJobIds.length === 0 && timeSeriesJobIds.length > 0) {
          warningText += i18n.translate('xpack.ml.timeSeriesExplorer.autoSelectingFirstJobText', {
            defaultMessage: ', auto selecting first job'
          });
        }
        toastNotifications.addWarning(warningText);
      }

      if (selectedJobIds.length > 1) {
      // if more than one job or a group has been loaded from the URL
        if (selectedJobIds.length > 1) {
        // if more than one job, select the first job from the selection.
          toastNotifications.addWarning(
            i18n.translate('xpack.ml.timeSeriesExplorer.youCanViewOneJobAtTimeWarningMessage', {
              defaultMessage: 'You can only view one job at a time in this dashboard'
            })
          );

          setGlobalState(globalState, { selectedIds: [selectedJobIds[0]] });
          mlJobSelectService.next({ selection: [selectedJobIds[0]], resetSelection: true });
        } else {
        // if a group has been loaded
          if (selectedJobIds.length > 0) {
          // if the group contains valid jobs, select the first
            toastNotifications.addWarning(
              i18n.translate('xpack.ml.timeSeriesExplorer.youCanViewOneJobAtTimeWarningMessage', {
                defaultMessage: 'You can only view one job at a time in this dashboard'
              })
            );

            setGlobalState(globalState, { selectedIds: [selectedJobIds[0]] });
            mlJobSelectService.next({ selection: [selectedJobIds[0]], resetSelection: true });
          } else if ($scope.jobs.length > 0) {
          // if there are no valid jobs in the group but there are valid jobs
          // in the list of all jobs, select the first
            setGlobalState(globalState, { selectedIds: [$scope.jobs[0].id] });
            mlJobSelectService.next({ selection: [$scope.jobs[0].id], resetSelection: true });
          } else {
          // if there are no valid jobs left.
            $scope.loading = false;
          }
        }
      } else if (invalidIds.length > 0 && selectedJobIds.length > 0) {
      // if some ids have been filtered out because they were invalid.
      // refresh the URL with the first valid id
        setGlobalState(globalState, { selectedIds: [selectedJobIds[0]] });
        mlJobSelectService.next({ selection: [selectedJobIds[0]], resetSelection: true });
      } else if (selectedJobIds.length > 0) {
      // normal behavior. a job ID has been loaded from the URL
        loadForJobId(selectedJobIds[0]);
      } else {
        if (selectedJobIds.length === 0 && $scope.jobs.length > 0) {
        // no jobs were loaded from the URL, so add the first job
        // from the full jobs list.
          setGlobalState(globalState, { selectedIds: [$scope.jobs[0].id] });
          mlJobSelectService.next({ selection: [$scope.jobs[0].id], resetSelection: true });
        } else {
        // Jobs exist, but no time series jobs.
          $scope.loading = false;
        }
      }
    } else {
      $scope.loading = false;
    }

    $scope.$applyAsync();
  };

  $scope.refresh = function () {

    if ($scope.selectedJob === undefined) {
      return;
    }

    $scope.loading = true;
    $scope.hasResults = false;
    $scope.dataNotChartable = false;
    delete $scope.chartDetails;
    delete $scope.contextChartData;
    delete $scope.focusChartData;
    delete $scope.contextForecastData;
    delete $scope.focusForecastData;

    // Counter to keep track of what data sets have been loaded.
    $scope.loadCounter++;
    let awaitingCount = 3;

    // finish() function, called after each data set has been loaded and processed.
    // The last one to call it will trigger the page render.
    function finish(counterVar) {
      awaitingCount--;
      if (awaitingCount === 0 && (counterVar === $scope.loadCounter)) {

        if (($scope.contextChartData && $scope.contextChartData.length) ||
          ($scope.contextForecastData && $scope.contextForecastData.length)) {
          $scope.hasResults = true;
        } else {
          $scope.hasResults = false;
        }
        $scope.loading = false;

        // Set zoomFrom/zoomTo attributes in scope which will result in the metric chart automatically
        // selecting the specified range in the context chart, and so loading that date range in the focus chart.
        if ($scope.contextChartData.length) {
          const focusRange = calculateInitialFocusRange();
          $scope.zoomFrom = focusRange[0];
          $scope.zoomTo = focusRange[1];
        }

        // Tell the results container directives to render.
        // Need to use $timeout to ensure the broadcast happens after the child scope is updated with the new data.
        if (($scope.contextChartData && $scope.contextChartData.length) ||
          ($scope.contextForecastData && $scope.contextForecastData.length)) {
          $timeout(() => {
            $scope.$broadcast('render');
          }, 0);
        } else {
          // Call $applyAsync() if for any reason the upper condition doesn't trigger the $timeout.
          // We still want to trigger a scope update about the changes above the condition.
          $scope.$applyAsync();
        }

      }
    }

    const bounds = timefilter.getActiveBounds();

    const detectorIndex = +$scope.detectorId;
    $scope.modelPlotEnabled = isModelPlotEnabled($scope.selectedJob, detectorIndex, $scope.entities);


    // Only filter on the entity if the field has a value.
    const nonBlankEntities = _.filter($scope.entities, (entity) => { return entity.fieldValue.length > 0; });
    $scope.criteriaFields = [{
      'fieldName': 'detector_index',
      'fieldValue': detectorIndex }
    ].concat(nonBlankEntities);

    if ($scope.modelPlotEnabled === false &&
      isSourceDataChartableForDetector($scope.selectedJob, detectorIndex) === false &&
      nonBlankEntities.length > 0) {
      // For detectors where model plot has been enabled with a terms filter and the
      // selected entity(s) are not in the terms list, indicate that data cannot be viewed.
      $scope.hasResults = false;
      $scope.loading = false;
      $scope.dataNotChartable = true;
      $scope.$applyAsync();
      return;
    }

    // Calculate the aggregation interval for the context chart.
    // Context chart swimlane will display bucket anomaly score at the same interval.
    $scope.contextAggregationInterval = calculateAggregationInterval(bounds, CHARTS_POINT_TARGET, CHARTS_POINT_TARGET);
    console.log('aggregationInterval for context data (s):', $scope.contextAggregationInterval.asSeconds());

    // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
    // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
    // to some extent with all detector functions if not searching complete buckets.
    const searchBounds = getBoundsRoundedToInterval(bounds, $scope.contextAggregationInterval, false);

    // Query 1 - load metric data at low granularity across full time range.
    // Pass a counter flag into the finish() function to make sure we only process the results
    // for the most recent call to the load the data in cases where the job selection and time filter
    // have been altered in quick succession (such as from the job picker with 'Apply time range').
    const counter = $scope.loadCounter;
    mlTimeSeriesSearchService.getMetricData(
      $scope.selectedJob,
      detectorIndex,
      nonBlankEntities,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      $scope.contextAggregationInterval.expression
    ).then((resp) => {
      const fullRangeChartData = processMetricPlotResults(resp.results, $scope.modelPlotEnabled);
      $scope.contextChartData = fullRangeChartData;
      console.log('Time series explorer context chart data set:', $scope.contextChartData);

      finish(counter);
    }).catch((resp) => {
      console.log('Time series explorer - error getting metric data from elasticsearch:', resp);
    });

    // Query 2 - load max record score at same granularity as context chart
    // across full time range for use in the swimlane.
    mlResultsService.getRecordMaxScoreByTime(
      $scope.selectedJob.job_id,
      $scope.criteriaFields,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      $scope.contextAggregationInterval.expression
    ).then((resp) => {
      const fullRangeRecordScoreData = processRecordScoreResults(resp.results);
      $scope.swimlaneData = fullRangeRecordScoreData;
      console.log('Time series explorer swimlane anomalies data set:', $scope.swimlaneData);

      finish(counter);
    }).catch((resp) => {
      console.log('Time series explorer - error getting bucket anomaly scores from elasticsearch:', resp);
    });

    // Query 3 - load details on the chart used in the chart title (charting function and entity(s)).
    mlTimeSeriesSearchService.getChartDetails(
      $scope.selectedJob,
      detectorIndex,
      $scope.entities,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf()
    ).then((resp) => {
      $scope.chartDetails = resp.results;
      finish(counter);
    }).catch((resp) => {
      console.log('Time series explorer - error getting entity counts from elasticsearch:', resp);
    });

    // Plus query for forecast data if there is a forecastId stored in the appState.
    const forecastId = _.get($scope, 'appState.mlTimeSeriesExplorer.forecastId');
    if (forecastId !== undefined) {
      awaitingCount++;
      let aggType = undefined;
      const detector = $scope.selectedJob.analysis_config.detectors[detectorIndex];
      const esAgg = mlFunctionToESAggregation(detector.function);
      if ($scope.modelPlotEnabled === false && (esAgg === 'sum' || esAgg === 'count')) {
        aggType = { avg: 'sum', max: 'sum', min: 'sum' };
      }
      mlForecastService.getForecastData(
        $scope.selectedJob,
        detectorIndex,
        forecastId,
        nonBlankEntities,
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        $scope.contextAggregationInterval.expression,
        aggType)
        .then((resp) => {
          $scope.contextForecastData = processForecastResults(resp.results);
          finish(counter);
        }).catch((resp) => {
          console.log(`Time series explorer - error loading data for forecast ID ${forecastId}`, resp);
        });
    }

    loadEntityValues();
  };

  $scope.refreshFocusData = function (fromDate, toDate) {

    // Counter to keep track of the queries to populate the chart.
    let awaitingCount = 4;

    // This object is used to store the results of individual remote requests
    // before we transform it into the final data and apply it to $scope. Otherwise
    // we might trigger multiple $digest cycles and depending on how deep $watches
    // listen for changes we could miss updates.
    const refreshFocusData = {};

    // finish() function, called after each data set has been loaded and processed.
    // The last one to call it will trigger the page render.
    function finish() {
      awaitingCount--;
      if (awaitingCount === 0) {
        // Tell the results container directives to render the focus chart.
        refreshFocusData.focusChartData = processDataForFocusAnomalies(
          refreshFocusData.focusChartData,
          refreshFocusData.anomalyRecords,
          $scope.timeFieldName,
          $scope.focusAggregationInterval,
          $scope.modelPlotEnabled);

        refreshFocusData.focusChartData = processScheduledEventsForChart(
          refreshFocusData.focusChartData,
          refreshFocusData.scheduledEvents);

        // All the data is ready now for a scope update.
        // Use $evalAsync to ensure the update happens after the child scope is updated with the new data.
        $scope.$evalAsync(() => {
          $scope = Object.assign($scope, refreshFocusData);
          console.log('Time series explorer focus chart data set:', $scope.focusChartData);

          $scope.loading = false;

          // If the annotations failed to load and the feature flag is set to `false`,
          // make sure the checkbox toggle gets hidden.
          if (mlAnnotationsEnabled === false) {
            $scope.showAnnotationsCheckbox = false;
          }
        });
      }
    }

    const detectorIndex = +$scope.detectorId;
    const nonBlankEntities = _.filter($scope.entities, entity => entity.fieldValue.length > 0);

    // Calculate the aggregation interval for the focus chart.
    const bounds = { min: moment(fromDate), max: moment(toDate) };
    $scope.focusAggregationInterval = calculateAggregationInterval(bounds, CHARTS_POINT_TARGET, CHARTS_POINT_TARGET);

    // Ensure the search bounds align to the bucketing interval so that the first and last buckets are complete.
    // For sum or count detectors, short buckets would hold smaller values, and model bounds would also be affected
    // to some extent with all detector functions if not searching complete buckets.
    const searchBounds = getBoundsRoundedToInterval(bounds, $scope.focusAggregationInterval, false);

    // Query 1 - load metric data across selected time range.
    mlTimeSeriesSearchService.getMetricData(
      $scope.selectedJob,
      detectorIndex,
      nonBlankEntities,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      $scope.focusAggregationInterval.expression
    ).then((resp) => {
      refreshFocusData.focusChartData = processMetricPlotResults(resp.results, $scope.modelPlotEnabled);
      $scope.showModelBoundsCheckbox = ($scope.modelPlotEnabled === true) &&
        (refreshFocusData.focusChartData.length > 0);
      finish();
    }).catch((resp) => {
      console.log('Time series explorer - error getting metric data from elasticsearch:', resp);
    });

    // Query 2 - load all the records across selected time range for the chart anomaly markers.
    mlResultsService.getRecordsForCriteria(
      [$scope.selectedJob.job_id],
      $scope.criteriaFields,
      0,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      ANOMALIES_TABLE_DEFAULT_QUERY_SIZE
    ).then((resp) => {
      // Sort in descending time order before storing in scope.
      refreshFocusData.anomalyRecords = _.chain(resp.records)
        .sortBy(record => record[$scope.timeFieldName])
        .reverse()
        .value();
      console.log('Time series explorer anomalies:', refreshFocusData.anomalyRecords);
      finish();
    });

    // Query 3 - load any scheduled events for the selected job.
    mlResultsService.getScheduledEventsByBucket(
      [$scope.selectedJob.job_id],
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      $scope.focusAggregationInterval.expression,
      1,
      MAX_SCHEDULED_EVENTS
    ).then((resp) => {
      refreshFocusData.scheduledEvents = resp.events[$scope.selectedJob.job_id];
      finish();
    }).catch((resp) => {
      console.log('Time series explorer - error getting scheduled events from elasticsearch:', resp);
    });

    // Query 4 - load any annotations for the selected job.
    if (mlAnnotationsEnabled) {
      ml.annotations.getAnnotations({
        jobIds: [$scope.selectedJob.job_id],
        earliestMs: searchBounds.min.valueOf(),
        latestMs: searchBounds.max.valueOf(),
        maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE
      }).then((resp) => {
        refreshFocusData.focusAnnotationData = [];

        if (Array.isArray(resp.annotations[$scope.selectedJob.job_id])) {
          refreshFocusData.focusAnnotationData = resp.annotations[$scope.selectedJob.job_id]
            .sort((a, b) => {
              return a.timestamp - b.timestamp;
            })
            .map((d, i) => {
              d.key = String.fromCharCode(65 + i);
              return d;
            });
        }

        finish();
      }).catch(() => {
        // silently fail and disable annotations feature if loading annotations fails.
        refreshFocusData.focusAnnotationData = [];
        mlAnnotationsEnabled = false;
        finish();
      });
    } else {
      finish();
    }

    // Plus query for forecast data if there is a forecastId stored in the appState.
    const forecastId = _.get($scope, 'appState.mlTimeSeriesExplorer.forecastId');
    if (forecastId !== undefined) {
      awaitingCount++;
      let aggType = undefined;
      const detector = $scope.selectedJob.analysis_config.detectors[detectorIndex];
      const esAgg = mlFunctionToESAggregation(detector.function);
      if ($scope.modelPlotEnabled === false && (esAgg === 'sum' || esAgg === 'count')) {
        aggType = { avg: 'sum', max: 'sum', min: 'sum' };
      }

      mlForecastService.getForecastData(
        $scope.selectedJob,
        detectorIndex,
        forecastId,
        nonBlankEntities,
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        $scope.focusAggregationInterval.expression,
        aggType)
        .then((resp) => {
          refreshFocusData.focusForecastData = processForecastResults(resp.results);
          refreshFocusData.showForecastCheckbox = (refreshFocusData.focusForecastData.length > 0);
          finish();
        }).catch((resp) => {
          console.log(`Time series explorer - error loading data for forecast ID ${forecastId}`, resp);
        });
    }

    // Load the data for the anomalies table.
    loadAnomaliesTableData(searchBounds.min.valueOf(), searchBounds.max.valueOf());

  };

  $scope.saveSeriesPropertiesAndRefresh = function () {
    $scope.appState.mlTimeSeriesExplorer.detectorIndex = +$scope.detectorId;
    $scope.appState.mlTimeSeriesExplorer.entities = {};
    _.each($scope.entities, (entity) => {
      $scope.appState.mlTimeSeriesExplorer.entities[entity.fieldName] = entity.fieldValue;
    });
    $scope.appState.save();

    $scope.refresh();
  };

  $scope.filter = function (field, value, operator) {
    const entity = _.find($scope.entities, { fieldName: field });
    if (entity !== undefined) {
      if (operator === '+' && entity.fieldValue !== value) {
        entity.fieldValue = value;
        $scope.saveSeriesPropertiesAndRefresh();
      } else if (operator === '-' && entity.fieldValue === value) {
        entity.fieldValue = '';
        $scope.saveSeriesPropertiesAndRefresh();
      }
    }
  };

  $scope.loadForForecastId = function (forecastId) {
    mlForecastService.getForecastDateRange(
      $scope.selectedJob,
      forecastId
    ).then((resp) => {
      const bounds = timefilter.getActiveBounds();
      const earliest = moment(resp.earliest || timefilter.getTime().from);
      const latest = moment(resp.latest || timefilter.getTime().to);

      // Store forecast ID in the appState.
      $scope.appState.mlTimeSeriesExplorer.forecastId = forecastId;

      // Set the zoom to centre on the start of the forecast range, depending
      // on the time range of the forecast and data.
      const earliestDataDate = _.first($scope.contextChartData).date;
      const zoomLatestMs = Math.min(earliest + ($scope.autoZoomDuration / 2), latest.valueOf());
      const zoomEarliestMs = Math.max(zoomLatestMs - $scope.autoZoomDuration, earliestDataDate.getTime());

      const zoomState = {
        from: moment(zoomEarliestMs).toISOString(),
        to: moment(zoomLatestMs).toISOString()
      };
      $scope.appState.mlTimeSeriesExplorer.zoom = zoomState;

      $scope.appState.save();

      // Ensure the forecast data will be shown if hidden previously.
      $scope.showForecast = true;


      if (earliest.isBefore(bounds.min) || latest.isAfter(bounds.max)) {
        const earliestMs = Math.min(earliest.valueOf(), bounds.min.valueOf());
        const latestMs = Math.max(latest.valueOf(), bounds.max.valueOf());

        timefilter.setTime({
          from: moment(earliestMs).toISOString(),
          to: moment(latestMs).toISOString()
        });
      } else {
        // Refresh to show the requested forecast data.
        $scope.refresh();
      }

    }).catch((resp) => {
      console.log('Time series explorer - error loading time range of forecast from elasticsearch:', resp);
    });
  };

  $scope.detectorIndexChanged = function () {
    updateControlsForDetector();
    loadEntityValues();
  };

  $scope.toggleShowModelBounds = function () {
    $timeout(() => {
      $scope.showModelBounds = !$scope.showModelBounds;
    }, 0);
  };

  if (mlAnnotationsEnabled) {
    $scope.toggleShowAnnotations = function () {
      $timeout(() => {
        $scope.showAnnotations = !$scope.showAnnotations;
      }, 0);
    };
  }

  $scope.toggleShowForecast = function () {
    $timeout(() => {
      $scope.showForecast = !$scope.showForecast;
    }, 0);
  };

  // Refresh the data when the time range is altered.
  $scope.$listenAndDigestAsync(timefilter, 'fetch', $scope.refresh);

  // Add a watcher for auto-refresh of the time filter to refresh all the data.
  const refreshWatcher = Private(refreshIntervalWatcher);
  refreshWatcher.init(() => {
    $scope.refresh();
  });

  // Reload the anomalies table if the Interval or Threshold controls are changed.
  const tableControlsListener = function () {
    if ($scope.zoomFrom !== undefined && $scope.zoomTo !== undefined) {
      loadAnomaliesTableData($scope.zoomFrom.getTime(), $scope.zoomTo.getTime());
    }
  };

  const intervalSub = interval$.subscribe(tableControlsListener);
  const severitySub = severity$.subscribe(tableControlsListener);
  const annotationsRefreshSub = annotationsRefresh$.subscribe($scope.refresh);
  // Listen for changes to job selection.
  const jobSelectServiceSub = mlJobSelectService.subscribe(({ selection }) => {
    // Clear the detectorIndex, entities and forecast info.
    if (selection.length > 0 && $scope.appState !== undefined) {
      delete $scope.appState.mlTimeSeriesExplorer.detectorIndex;
      delete $scope.appState.mlTimeSeriesExplorer.entities;
      delete $scope.appState.mlTimeSeriesExplorer.forecastId;
      $scope.appState.save();

      $scope.showForecastCheckbox = false;
      loadForJobId(selection[0]);
    }
  });

  $scope.$on('$destroy', () => {
    refreshWatcher.cancel();
    intervalSub.unsubscribe();
    severitySub.unsubscribe();
    annotationsRefreshSub.unsubscribe();
    jobSelectServiceSub.unsubscribe();
  });

  $scope.$on('contextChartSelected', function (event, selection) {
    // Save state of zoom (adds to URL) if it is different to the default.
    if (($scope.contextChartData === undefined || $scope.contextChartData.length === 0) &&
      ($scope.contextForecastData === undefined || $scope.contextForecastData.length === 0)) {
      return;
    }

    const defaultRange = calculateDefaultFocusRange();

    if ((selection.from.getTime() !== defaultRange[0].getTime() || selection.to.getTime() !== defaultRange[1].getTime()) &&
      (isNaN(Date.parse(selection.from)) === false && isNaN(Date.parse(selection.to)) === false)) {
      const zoomState = { from: selection.from.toISOString(), to: selection.to.toISOString() };
      $scope.appState.mlTimeSeriesExplorer.zoom = zoomState;
    } else {
      delete $scope.appState.mlTimeSeriesExplorer.zoom;
    }
    $scope.appState.save();

    if ($scope.focusChartData === undefined ||
      ($scope.zoomFrom.getTime() !== selection.from.getTime()) ||
      ($scope.zoomTo.getTime() !== selection.to.getTime())) {
      $scope.refreshFocusData(selection.from, selection.to);
    }

    $scope.zoomFrom = selection.from;
    $scope.zoomTo = selection.to;

  });

  function loadForJobId(jobId) {
    // Validation that the ID is for a time series job must already have been performed.
    // Check if the job was created since the page was first loaded.
    let jobPickerSelectedJob = _.find($scope.jobs, { 'id': jobId });
    if (jobPickerSelectedJob === undefined) {
      const newJobs = [];
      _.each(mlJobService.jobs, (job) => {
        if (isTimeSeriesViewJob(job) === true) {
          const bucketSpan = parseInterval(job.analysis_config.bucket_span);
          newJobs.push({ id: job.job_id, selected: false, bucketSpanSeconds: bucketSpan.asSeconds() });
        }
      });
      $scope.jobs = newJobs;
      jobPickerSelectedJob = _.find(newJobs, { 'id': jobId });
    }

    $scope.selectedJob = mlJobService.getJob(jobId);
    $scope.jobPickerSelections = [jobPickerSelectedJob];

    // Read the detector index and entities out of the AppState.
    const jobDetectors = $scope.selectedJob.analysis_config.detectors;
    const viewableDetectors = [];
    _.each(jobDetectors, (dtr, index) => {
      if (isTimeSeriesViewDetector($scope.selectedJob, index)) {
        viewableDetectors.push({ index: '' + index, detector_description: dtr.detector_description });
      }
    });
    $scope.detectors = viewableDetectors;

    // Check the supplied index is valid.
    const appStateDtrIdx = $scope.appState.mlTimeSeriesExplorer.detectorIndex;
    let detectorIndex = appStateDtrIdx !== undefined ? appStateDtrIdx : +(viewableDetectors[0].index);
    if (_.find(viewableDetectors, { 'index': '' + detectorIndex }) === undefined) {
      const warningText = i18n.translate('xpack.ml.timeSeriesExplorer.requestedDetectorIndexNotValidWarningMessage', {
        defaultMessage: 'Requested detector index {detectorIndex} is not valid for job {jobId}',
        values: {
          detectorIndex,
          jobId: $scope.selectedJob.job_id
        }
      });
      toastNotifications.addWarning(warningText);
      detectorIndex = +(viewableDetectors[0].index);
      $scope.appState.mlTimeSeriesExplorer.detectorIndex = detectorIndex;
      $scope.appState.save();
    }

    // Store the detector index as a string so it can be used as ng-model in a select control.
    $scope.detectorId = '' + detectorIndex;

    updateControlsForDetector();

    // Populate the map of jobs / detectors / field formatters for the selected IDs and refresh.
    mlFieldFormatService.populateFormats([jobId], getIndexPatterns())
      .catch((err) => { console.log('Error populating field formats:', err); })
      // Load the data - if the FieldFormats failed to populate
      // the default formatting will be used for metric values.
      .then(() => {
        $scope.refresh();
      });
  }

  function loadAnomaliesTableData(earliestMs, latestMs) {

    ml.results.getAnomaliesTableData(
      [$scope.selectedJob.job_id],
      $scope.criteriaFields,
      [],
      interval$.getValue().val,
      severity$.getValue().val,
      earliestMs,
      latestMs,
      dateFormatTz,
      ANOMALIES_TABLE_DEFAULT_QUERY_SIZE
    ).then((resp) => {
      const anomalies = resp.anomalies;
      const detectorsByJob = mlJobService.detectorsByJob;
      anomalies.forEach((anomaly) => {
        // Add a detector property to each anomaly.
        // Default to functionDescription if no description available.
        // TODO - when job_service is moved server_side, move this to server endpoint.
        const jobId = anomaly.jobId;
        const detector = _.get(detectorsByJob, [jobId, anomaly.detectorIndex]);
        anomaly.detector = _.get(detector,
          ['detector_description'],
          anomaly.source.function_description);

        // For detectors with rules, add a property with the rule count.
        const customRules = detector.custom_rules;
        if (customRules !== undefined) {
          anomaly.rulesLength = customRules.length;
        }

        // Add properties used for building the links menu.
        // TODO - when job_service is moved server_side, move this to server endpoint.
        if (_.has(mlJobService.customUrlsByJob, jobId)) {
          anomaly.customUrls = mlJobService.customUrlsByJob[jobId];
        }
      });

      $scope.$evalAsync(() => {
        $scope.tableData = {
          anomalies,
          interval: resp.interval,
          examplesByJobId: resp.examplesByJobId,
          showViewSeriesLink: false
        };
      });

    }).catch((resp) => {
      console.log('Time series explorer - error loading data for anomalies table:', resp);
    });
  }

  function updateControlsForDetector() {
    // Update the entity dropdown control(s) according to the partitioning fields for the selected detector.
    const detectorIndex = +$scope.detectorId;
    const detector = $scope.selectedJob.analysis_config.detectors[detectorIndex];

    const entities = [];
    const entitiesState = $scope.appState.mlTimeSeriesExplorer.entities || {};
    const partitionFieldName = _.get(detector, 'partition_field_name');
    const overFieldName = _.get(detector, 'over_field_name');
    const byFieldName = _.get(detector, 'by_field_name');
    if (partitionFieldName !== undefined) {
      const partitionFieldValue = _.get(entitiesState, partitionFieldName, '');
      entities.push({ fieldName: partitionFieldName, fieldValue: partitionFieldValue });
    }
    if (overFieldName !== undefined) {
      const overFieldValue = _.get(entitiesState, overFieldName, '');
      entities.push({ fieldName: overFieldName, fieldValue: overFieldValue });
    }

    // For jobs with by and over fields, don't add the 'by' field as this
    // field will only be added to the top-level fields for record type results
    // if it also an influencer over the bucket.
    // TODO - metric data can be filtered by this field, so should only exclude
    // from filter for the anomaly records.
    if (byFieldName !== undefined && overFieldName === undefined) {
      const byFieldValue = _.get(entitiesState, byFieldName, '');
      entities.push({ fieldName: byFieldName, fieldValue: byFieldValue });
    }

    $scope.entities = entities;
  }

  function loadEntityValues() {
    // Populate the entity input datalists with the values from the top records by score
    // for the selected detector across the full time range. No need to pass through finish().
    const bounds = timefilter.getActiveBounds();
    const detectorIndex = +$scope.detectorId;

    mlResultsService.getRecordsForCriteria(
      [$scope.selectedJob.job_id],
      [{ 'fieldName': 'detector_index', 'fieldValue': detectorIndex }],
      0,
      bounds.min.valueOf(),
      bounds.max.valueOf(),
      ANOMALIES_TABLE_DEFAULT_QUERY_SIZE)
      .then((resp) => {
        if (resp.records && resp.records.length > 0) {
          const firstRec = resp.records[0];

          _.each($scope.entities, (entity) => {
            if (firstRec.partition_field_name === entity.fieldName) {
              entity.fieldValues = _.chain(resp.records).pluck('partition_field_value').uniq().value();
            }
            if (firstRec.over_field_name === entity.fieldName) {
              entity.fieldValues = _.chain(resp.records).pluck('over_field_value').uniq().value();
            }
            if (firstRec.by_field_name === entity.fieldName) {
              entity.fieldValues = _.chain(resp.records).pluck('by_field_value').uniq().value();
            }
          });
          $scope.$applyAsync();
        }

      });
  }

  function calculateInitialFocusRange() {
    // Check for a zoom parameter in the appState (URL).
    const zoomState = $scope.appState.mlTimeSeriesExplorer.zoom;
    if (zoomState !== undefined) {
      // Calculate the 'auto' zoom duration which shows data at bucket span granularity.
      $scope.autoZoomDuration = getAutoZoomDuration();

      // Check that the zoom times are valid.
      // zoomFrom must be at or after dashboard earliest,
      // zoomTo must be at or before dashboard latest plus context chart agg interval.
      const zoomFrom = moment(zoomState.from, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
      const zoomTo = moment(zoomState.to, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
      const aggIntervalMs = $scope.contextAggregationInterval.asMilliseconds();
      const bounds = timefilter.getActiveBounds();
      const earliest = bounds.min;
      const latest = moment(bounds.max).add(aggIntervalMs, 'ms');

      if (zoomFrom.isValid() && zoomTo.isValid &&
        zoomTo.isAfter(zoomFrom) &&
        zoomFrom.isBetween(earliest, latest, null, '[]') &&
        zoomTo.isBetween(earliest, latest, null, '[]')) {
        return [zoomFrom.toDate(), zoomTo.toDate()];
      }
    }

    return calculateDefaultFocusRange();
  }

  function calculateDefaultFocusRange() {

    $scope.autoZoomDuration = getAutoZoomDuration();
    const isForecastData = $scope.contextForecastData !== undefined && $scope.contextForecastData.length > 0;

    const combinedData = (isForecastData === false) ?
      $scope.contextChartData : $scope.contextChartData.concat($scope.contextForecastData);
    const earliestDataDate = _.first(combinedData).date;
    const latestDataDate = _.last(combinedData).date;

    let rangeEarliestMs;
    let rangeLatestMs;

    if (isForecastData === true) {
      // Return a range centred on the start of the forecast range, depending
      // on the time range of the forecast and data.
      const earliestForecastDataDate = _.first($scope.contextForecastData).date;
      const latestForecastDataDate = _.last($scope.contextForecastData).date;

      rangeLatestMs = Math.min(earliestForecastDataDate.getTime() + ($scope.autoZoomDuration / 2), latestForecastDataDate.getTime());
      rangeEarliestMs = Math.max(rangeLatestMs - $scope.autoZoomDuration, earliestDataDate.getTime());
    } else {
      // Returns the range that shows the most recent data at bucket span granularity.
      rangeLatestMs = latestDataDate.getTime() + $scope.contextAggregationInterval.asMilliseconds();
      rangeEarliestMs = Math.max(earliestDataDate.getTime(), rangeLatestMs - $scope.autoZoomDuration);
    }

    return [new Date(rangeEarliestMs), new Date(rangeLatestMs)];

  }

  function calculateAggregationInterval(bounds, bucketsTarget) {
    // Aggregation interval used in queries should be a function of the time span of the chart
    // and the bucket span of the selected job(s).
    const barTarget = (bucketsTarget !== undefined ? bucketsTarget : 100);
    // Use a maxBars of 10% greater than the target.
    const maxBars = Math.floor(1.1 * barTarget);
    const buckets = new MlTimeBuckets();
    buckets.setInterval('auto');
    buckets.setBounds(bounds);
    buckets.setBarTarget(Math.floor(barTarget));
    buckets.setMaxBars(maxBars);

    // Ensure the aggregation interval is always a multiple of the bucket span to avoid strange
    // behaviour such as adjacent chart buckets holding different numbers of job results.
    const bucketSpanSeconds =  _.find($scope.jobs, { 'id': $scope.selectedJob.job_id }).bucketSpanSeconds;
    let aggInterval = buckets.getIntervalToNearestMultiple(bucketSpanSeconds);

    // Set the interval back to the job bucket span if the auto interval is smaller.
    const secs = aggInterval.asSeconds();
    if (secs < bucketSpanSeconds) {
      buckets.setInterval(bucketSpanSeconds + 's');
      aggInterval = buckets.getInterval();
    }

    console.log('calculateAggregationInterval() barTarget,maxBars,returning:', bucketsTarget, maxBars,
      (bounds.max.diff(bounds.min)) / aggInterval.asMilliseconds());

    return aggInterval;
  }

  function getAutoZoomDuration() {
    // Calculate the 'auto' zoom duration which shows data at bucket span granularity.
    // Get the minimum bucket span of selected jobs.
    // TODO - only look at jobs for which data has been returned?
    const bucketSpanSeconds =  _.find($scope.jobs, { 'id': $scope.selectedJob.job_id }).bucketSpanSeconds;

    // In most cases the duration can be obtained by simply multiplying the points target
    // Check that this duration returns the bucket span when run back through the
    // TimeBucket interval calculation.
    let autoZoomDuration = (bucketSpanSeconds * 1000) * (CHARTS_POINT_TARGET - 1);

    // Use a maxBars of 10% greater than the target.
    const maxBars = Math.floor(1.1 * CHARTS_POINT_TARGET);
    const buckets = new MlTimeBuckets();
    buckets.setInterval('auto');
    buckets.setBarTarget(Math.floor(CHARTS_POINT_TARGET));
    buckets.setMaxBars(maxBars);

    // Set bounds from 'now' for testing the auto zoom duration.
    const nowMs = new Date().getTime();
    const max = moment(nowMs);
    const min = moment(nowMs - autoZoomDuration);
    buckets.setBounds({ min, max });

    const calculatedInterval = buckets.getIntervalToNearestMultiple(bucketSpanSeconds);
    const calculatedIntervalSecs = calculatedInterval.asSeconds();
    if (calculatedIntervalSecs !== bucketSpanSeconds) {
      // If we haven't got the span back, which may occur depending on the 'auto' ranges
      // used in TimeBuckets and the bucket span of the job, then multiply by the ratio
      // of the bucket span to the calculated interval.
      autoZoomDuration = autoZoomDuration * (bucketSpanSeconds / calculatedIntervalSecs);
    }

    return autoZoomDuration;

  }

  $scope.initializeVis();
});
