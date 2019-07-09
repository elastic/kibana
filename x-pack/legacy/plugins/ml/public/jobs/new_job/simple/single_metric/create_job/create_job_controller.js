/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import 'ui/angular_ui_select';

import { aggTypes } from 'ui/agg_types';
import { addJobValidationMethods } from 'plugins/ml/../common/util/validation_utils';
import { parseInterval } from 'plugins/ml/../common/util/parse_interval';

import dateMath from '@elastic/datemath';
import angular from 'angular';

import uiRoutes from 'ui/routes';
import { getSafeAggregationName } from 'plugins/ml/../common/util/job_utils';
import { checkLicenseExpired } from 'plugins/ml/license/check_license';
import { checkCreateJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { MlTimeBuckets } from 'plugins/ml/util/ml_time_buckets';
import { getCreateSingleMetricJobBreadcrumbs } from 'plugins/ml/jobs/breadcrumbs';
import { filterAggTypes } from 'plugins/ml/jobs/new_job/simple/components/utils/filter_agg_types';
import { validateJob } from 'plugins/ml/jobs/new_job/simple/components/utils/validate_job';
import { adjustIntervalDisplayed } from 'plugins/ml/jobs/new_job/simple/components/utils/adjust_interval';
import { getIndexedFields } from 'plugins/ml/jobs/new_job/simple/components/utils/create_fields';
import { changeJobIDCase } from 'plugins/ml/jobs/new_job/simple/components/general_job_details/change_job_id_case';
import { CHART_STATE, JOB_STATE } from 'plugins/ml/jobs/new_job/simple/components/constants/states';
import { loadCurrentIndexPattern, loadCurrentSavedSearch, timeBasedIndexCheck } from 'plugins/ml/util/index_utils';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { loadNewJobDefaults } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';
import {
  SearchItemsProvider,
  addNewJobToRecentlyAccessed,
  moveToAdvancedJobCreationProvider,
  focusOnResultsLink } from 'plugins/ml/jobs/new_job/utils/new_job_utils';
import { mlJobService } from 'plugins/ml/services/job_service';
import { preLoadJob } from 'plugins/ml/jobs/new_job/simple/components/utils/prepopulate_job_settings';
import { SingleMetricJobServiceProvider } from './create_job_service';
import { mlMessageBarService } from 'plugins/ml/components/messagebar/messagebar_service';

import template from './create_job.html';

import { timefilter } from 'ui/timefilter';

uiRoutes
  .when('/jobs/new_job/simple/single_metric', {
    template,
    k7Breadcrumbs: getCreateSingleMetricJobBreadcrumbs,
    resolve: {
      CheckLicense: checkLicenseExpired,
      privileges: checkCreateJobsPrivilege,
      indexPattern: loadCurrentIndexPattern,
      savedSearch: loadCurrentSavedSearch,
      checkMlNodesAvailable,
      loadNewJobDefaults,
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .controller('MlCreateSingleMetricJob', function ($scope, $route, $timeout, Private, AppState) {

    timefilter.enableTimeRangeSelector();
    timefilter.disableAutoRefreshSelector();
    const msgs = mlMessageBarService;
    const moveToAdvancedJobCreation = Private(moveToAdvancedJobCreationProvider);
    const mlSingleMetricJobService = Private(SingleMetricJobServiceProvider);

    const stateDefaults = {
      mlJobSettings: {}
    };
    const appState = new AppState(stateDefaults);

    $scope.index = $route.current.params.index;
    $scope.chartData = mlSingleMetricJobService.chartData;
    $scope.changeJobIDCase = changeJobIDCase;
    $scope.addNewJobToRecentlyAccessed = addNewJobToRecentlyAccessed;

    const PAGE_WIDTH = angular.element('.single-metric-job-container').width();
    const BAR_TARGET = (PAGE_WIDTH > 2000) ? 1000 : (PAGE_WIDTH / 2);
    const MAX_BARS = BAR_TARGET + (BAR_TARGET / 100) * 100; // 100% larger than bar target
    const REFRESH_INTERVAL_MS = 100;
    const MAX_BUCKET_DIFF = 3;
    const METRIC_AGG_TYPE = 'metrics';
    const DEFAULT_MODEL_MEMORY_LIMIT = '10MB';

    const jobProgressChecks = {
      25: false,
      50: false,
      75: false,
    };

    let refreshCounter = 0;

    $scope.JOB_STATE = JOB_STATE;
    $scope.jobState = $scope.JOB_STATE.NOT_STARTED;

    $scope.CHART_STATE = CHART_STATE;
    $scope.chartState = CHART_STATE.NOT_STARTED;

    // flag to stop all results polling if the user navigates away from this page
    let globalForceStop = false;

    const createSearchItems = Private(SearchItemsProvider);
    const {
      indexPattern,
      savedSearch,
      combinedQuery } = createSearchItems();

    timeBasedIndexCheck(indexPattern, true);

    $scope.indexPatternLinkText = i18n.translate('xpack.ml.newJob.simple.singleMetric.noResultsFound.indexPatternLinkText', {
      defaultMessage: 'full {indexPatternTitle} data',
      values: { indexPatternTitle: indexPattern.title }
    });
    $scope.nameNotValidMessage = i18n.translate('xpack.ml.newJob.simple.singleMetric.nameNotValidMessage', {
      defaultMessage: 'Enter a name for the job'
    });
    $scope.showAdvancedButtonAriaLabel = i18n.translate('xpack.ml.newJob.simple.singleMetric.showAdvancedButtonAriaLabel', {
      defaultMessage: 'Show Advanced'
    });
    $scope.hideAdvancedButtonAriaLabel = i18n.translate('xpack.ml.newJob.simple.singleMetric.hideAdvancedButtonAriaLabel', {
      defaultMessage: 'Hide Advanced'
    });
    const pageTitle = (savedSearch.id !== undefined) ?
      i18n.translate('xpack.ml.newJob.simple.singleMetric.savedSearchPageTitle', {
        defaultMessage: 'saved search {savedSearchTitle}',
        values: { savedSearchTitle: savedSearch.title }
      })
      : i18n.translate('xpack.ml.newJob.simple.singleMetric.indexPatternPageTitle', {
        defaultMessage: 'index pattern {indexPatternTitle}',
        values: { indexPatternTitle: indexPattern.title }
      });

    $scope.ui = {
      indexPattern,
      pageTitle,
      showJobInput: false,
      showJobFinished: false,
      dirty: true,
      formValid: false,
      bucketSpanValid: true,
      bucketSpanEstimator: { status: 0, message: '' },
      aggTypeOptions: filterAggTypes(aggTypes.byType[METRIC_AGG_TYPE]),
      fields: [],
      timeFields: [],
      intervals: [{
        title: i18n.translate('xpack.ml.newJob.simple.singleMetric.autoIntervalUnitTitle', {
          defaultMessage: 'Auto'
        }),
        value: 'auto',
      /*enabled: function (agg) {
        // not only do we need a time field, but the selected field needs
        // to be the time field. (see #3028)
        return agg.fieldIsTimeField();
      }*/
      }, {
        title: i18n.translate('xpack.ml.newJob.simple.singleMetric.millisecondIntervalUnitTitle', {
          defaultMessage: 'Millisecond'
        }),
        value: 'ms'
      }, {
        title: i18n.translate('xpack.ml.newJob.simple.singleMetric.secondIntervalUnitTitle', {
          defaultMessage: 'Second'
        }),
        value: 's'
      }, {
        title: i18n.translate('xpack.ml.newJob.simple.singleMetric.minuteIntervalUnitTitle', {
          defaultMessage: 'Minute'
        }),
        value: 'm'
      }, {
        title: i18n.translate('xpack.ml.newJob.simple.singleMetric.hourlyIntervalUnitTitle', {
          defaultMessage: 'Hourly'
        }),
        value: 'h'
      }, {
        title: i18n.translate('xpack.ml.newJob.simple.singleMetric.dailyIntervalUnitTitle', {
          defaultMessage: 'Daily'
        }),
        value: 'd'
      }, {
        title: i18n.translate('xpack.ml.newJob.simple.singleMetric.weeklyIntervalUnitTitle', {
          defaultMessage: 'Weekly'
        }),
        value: 'w'
      }, {
        title: i18n.translate('xpack.ml.newJob.simple.singleMetric.monthlyIntervalUnitTitle', {
          defaultMessage: 'Monthly'
        }),
        value: 'M'
      }, {
        title: i18n.translate('xpack.ml.newJob.simple.singleMetric.yearlyIntervalUnitTitle', {
          defaultMessage: 'Yearly'
        }),
        value: 'y'
      }, {
        title: i18n.translate('xpack.ml.newJob.simple.singleMetric.customIntervalUnitTitle', {
          defaultMessage: 'Custom'
        }),
        value: 'custom'
      }],
      chartHeight: 310,
      showAdvanced: false,
      resultsUrl: '',
      validation: {
        checks: {
          jobId: { valid: true },
          groupIds: { valid: true },
          modelMemoryLimit: { valid: true }
        },
      },
      isCountOrSum: false
    };

    $scope.formConfig = {
      agg: {
        type: undefined
      },
      field: null,
      bucketSpan: '15m',
      chartInterval: undefined,
      resultsIntervalSeconds: undefined,
      start: 0,
      end: 0,
      timeField: indexPattern.timeFieldName,
      indexPattern: undefined,
      usesSavedSearch: (savedSearch.id !== undefined),
      combinedQuery,
      jobId: '',
      description: '',
      jobGroups: [],
      useDedicatedIndex: false,
      isSparseData: false,
      modelMemoryLimit: DEFAULT_MODEL_MEMORY_LIMIT
    };

    // this is passed into the bucketspan estimator and  reference to the guessBucketSpan function is inserted
    // to allow it for be called automatically without user interaction.
    $scope.bucketSpanEstimatorExportedFunctions = {};

    $scope.aggChange = function () {
      loadFields();
      $scope.ui.isFormValid();
      $scope.ui.dirty = true;

      $scope.ui.isCountOrSum = ($scope.formConfig.agg.type.dslName === 'count' || $scope.formConfig.agg.type.dslName === 'sum');

      // clear the field if count is selected
      if ($scope.formConfig.agg.type.dslName === 'count') {
        $scope.formConfig.field = null;
      }
    };

    $scope.fieldChange = function () {
      $scope.ui.isFormValid();
      $scope.ui.dirty = true;
    };

    $scope.bucketSpanFieldChange = function () {
      $scope.ui.isFormValid();
      $scope.ui.bucketSpanEstimator.status = 0;
      $scope.ui.bucketSpanEstimator.message = '';

      $scope.ui.bucketSpanValid = true;
      const bucketSpanInterval = parseInterval($scope.formConfig.bucketSpan);
      if(bucketSpanInterval === null || bucketSpanInterval.asMilliseconds() === 0) {
        $scope.ui.bucketSpanValid = false;
      }
    };

    function setTime() {
      $scope.ui.bucketSpanValid = true;
      $scope.formConfig.start = dateMath.parse(timefilter.getTime().from).valueOf();
      $scope.formConfig.end = dateMath.parse(timefilter.getTime().to).valueOf();
      $scope.formConfig.format = 'epoch_millis';

      const bucketSpanInterval = parseInterval($scope.formConfig.bucketSpan);
      if(bucketSpanInterval === null || bucketSpanInterval.asMilliseconds() === 0) {
        $scope.ui.bucketSpanValid = false;
      }

      const bounds = timefilter.getActiveBounds();
      $scope.formConfig.chartInterval = new MlTimeBuckets();
      $scope.formConfig.chartInterval.setBarTarget(BAR_TARGET);
      $scope.formConfig.chartInterval.setMaxBars(MAX_BARS);
      $scope.formConfig.chartInterval.setInterval('auto');
      $scope.formConfig.chartInterval.setBounds(bounds);

      adjustIntervalDisplayed($scope.formConfig);

      $scope.ui.isFormValid();
      $scope.ui.dirty = true;
    }

    function loadFields() {
      const agg = $scope.formConfig.agg;
      let fields = [];
      agg.type.params.forEach((param) => {
        if (param.name === 'field') {
          fields = getIndexedFields(indexPattern, param.filterFieldTypes.split(','));
        }
      });

      $scope.ui.fields = [];
      _.each(fields, (field, i) => {
        const id = getSafeAggregationName(field.displayName, i);
        const f = {
          id,
          name: field.displayName,
          tooltip: field.displayName,
          agg,
          mlType: field.mlType,
        };
        $scope.ui.fields.push(f);
      });

      if ($scope.ui.fields.length === 1 ||
      ($scope.formConfig.field === null && agg.type.name === 'cardinality')) {
        $scope.formConfig.field = $scope.ui.fields[0];
      }
    }

    $scope.ui.isFormValid = function () {
      if ($scope.formConfig.agg.type === undefined ||
        $scope.formConfig.timeField === undefined) {

        $scope.ui.formValid = false;
      } else {
        $scope.ui.formValid = true;
      }
      return $scope.ui.formValid;
    };

    $scope.loadVis = function () {
      setTime();
      $scope.ui.isFormValid();

      if ($scope.ui.formValid) {

        $scope.ui.showJobInput = true;
        $scope.ui.showJobFinished = false;

        $scope.formConfig.indexPattern = indexPattern;
        $scope.ui.dirty = false;

        $scope.chartState = CHART_STATE.LOADING;
        $scope.$applyAsync();

        mlSingleMetricJobService.getLineChartResults($scope.formConfig)
          .then((resp) => {
            $scope.chartState = (resp.totalResults) ? CHART_STATE.LOADED : CHART_STATE.NO_RESULTS;
          })
          .catch((resp) => {
            msgs.error(resp.message);
            $scope.chartState = CHART_STATE.NO_RESULTS;
          })
          .then(() => {
            $scope.$broadcast('render');
            $scope.$applyAsync();
          });
      }
    };

    let ignoreModel = false;
    let refreshInterval = REFRESH_INTERVAL_MS;
    // function for creating a new job.
    // creates the job, opens it, creates the datafeed and starts it.
    // the job may fail to open, but the datafeed should still be created
    // if the job save was successful.
    $scope.createJob = function () {
      const tempJob = mlSingleMetricJobService.getJobFromConfig($scope.formConfig);
      if (validateJob(tempJob, $scope.ui.validation.checks)) {
        msgs.clear();
        // create the new job
        mlSingleMetricJobService.createJob($scope.formConfig)
          .then((job) => {
            // if save was successful, open the job
            mlJobService.openJob(job.job_id)
              .then(() => {
                // if open was successful create a new datafeed
                saveNewDatafeed(job, true);
              })
              .catch((resp) => {
                msgs.error(i18n.translate('xpack.ml.newJob.simple.singleMetric.openJobErrorMessage', {
                  defaultMessage: 'Could not open job: '
                }), resp);
                msgs.error(i18n.translate('xpack.ml.newJob.simple.singleMetric.creatingDatafeedErrorMessage', {
                  defaultMessage: 'Job created, creating datafeed anyway'
                }));
                // if open failed, still attempt to create the datafeed
                // as it may have failed because we've hit the limit of open jobs
                saveNewDatafeed(job, false);
              });

          })
          .catch((resp) => {
            // save failed
            msgs.error(i18n.translate('xpack.ml.newJob.simple.singleMetric.saveFailedErrorMessage', {
              defaultMessage: 'Save failed: '
            }), resp.resp);
            $scope.$applyAsync();
          });
      } else {
        // show the advanced section as the model memory limit is invalid
        if($scope.ui.validation.checks.modelMemoryLimit.valid === false) {
          $scope.ui.showAdvanced = true;
        }
      }

      // save new datafeed internal function
      // creates a new datafeed and attempts to start it depending
      // on startDatafeedAfterSave flag
      function saveNewDatafeed(job, startDatafeedAfterSave) {
        mlJobService.saveNewDatafeed(job.datafeed_config, job.job_id)
          .then(() => {

            if (startDatafeedAfterSave) {
              mlSingleMetricJobService.startDatafeed($scope.formConfig)
                .then(() => {
                  $scope.jobState = JOB_STATE.RUNNING;
                  refreshCounter = 0;
                  ignoreModel = false;
                  refreshInterval = REFRESH_INTERVAL_MS;
                  // create the interval size for querying results.
                  // it should not be smaller than the bucket_span
                  $scope.formConfig.resultsIntervalSeconds = $scope.formConfig.chartInterval.getInterval().asSeconds();
                  const bucketSpanSeconds = parseInterval($scope.formConfig.bucketSpan).asSeconds();
                  if ($scope.formConfig.resultsIntervalSeconds < bucketSpanSeconds) {
                    $scope.formConfig.resultsIntervalSeconds = bucketSpanSeconds;
                  }

                  $scope.resultsUrl = mlJobService.createResultsUrl(
                    [$scope.formConfig.jobId],
                    $scope.formConfig.start,
                    $scope.formConfig.end,
                    'timeseriesexplorer');

                  focusOnResultsLink('job_running_view_results_link', $timeout);

                  loadCharts();
                })
                .catch((resp) => {
                  // datafeed failed
                  msgs.error(i18n.translate('xpack.ml.newJob.simple.singleMetric.datafeedNotStartedErrorMessage', {
                    defaultMessage: 'Could not start datafeed: '
                  }), resp);
                })
                .then(() => {
                  $scope.$applyAsync();
                });
            } else {
              $scope.$applyAsync();
            }
          })
          .catch((resp) => {
            msgs.error(i18n.translate('xpack.ml.newJob.simple.singleMetric.saveDatafeedFailedErrorMessage', {
              defaultMessage: 'Save datafeed failed: '
            }), resp);
            $scope.$applyAsync();
          });
      }
    };

    addJobValidationMethods($scope, mlSingleMetricJobService);

    function loadCharts() {
      let forceStop = globalForceStop;
      // the percentage doesn't always reach 100, so periodically check the datafeed state
      // to see if the datafeed has stopped
      const counterLimit = 20 - (refreshInterval / REFRESH_INTERVAL_MS);
      if (refreshCounter >=  counterLimit) {
        refreshCounter = 0;
        mlSingleMetricJobService.checkDatafeedState($scope.formConfig)
          .then((state) => {
            if (state === 'stopped') {
              console.log('Stopping poll because datafeed state is: ' + state);
              $scope.$broadcast('render-results');
              forceStop = true;
              $scope.$applyAsync();
            }
            run();
          });
      } else {
        run();
      }

      function run() {
        refreshCounter++;
        reloadSwimlane()
          .then(() => {
            if (forceStop === false && $scope.chartData.percentComplete < 100) {
              // if state has been set to stopping (from the stop button), leave state as it is
              if ($scope.jobState === JOB_STATE.STOPPING) {
                $scope.jobState = JOB_STATE.STOPPING;
              } else {
                // otherwise assume the job is running
                $scope.jobState = JOB_STATE.RUNNING;
              }
            } else {
              $scope.jobState = JOB_STATE.FINISHED;
              focusOnResultsLink('job_finished_view_results_link', $timeout);
            }

            if (ignoreModel) {
              jobCheck();
            } else {

              // check to see if the percentage is past a threshold for reloading the full model
              let fullModelRefresh = false;
              _.each(jobProgressChecks, (c, i) => {
                if (jobProgressChecks[i] === false && $scope.chartData.percentComplete >= i) {
                  jobProgressChecks[i] = true;
                  fullModelRefresh = true;
                }
              });
              // the full model needs to be refreshed
              if (fullModelRefresh) {
                $scope.chartData.model = [];
              }

              reloadModelChart()
                .catch(() => {
                  // on the 10th model load failure, set ignoreModel to true to stop trying to load it.
                  if (refreshCounter % 10 === 0) {
                    console.log('Model has failed to load 10 times. Stop trying to load it.');
                    ignoreModel = true;
                  }
                })
                .then(() => {
                  jobCheck();
                });
            }
            $scope.$applyAsync();
          });
      }
    }

    function jobCheck() {
      let isLastRun = false;
      if ($scope.jobState === JOB_STATE.RUNNING || $scope.jobState === JOB_STATE.STOPPING) {
        refreshInterval = adjustRefreshInterval($scope.chartData.loadingDifference, refreshInterval);
        _.delay(loadCharts, refreshInterval);
      } else {
        $scope.chartData.percentComplete = 100;
        isLastRun = true;
      }

      if (isLastRun && !ignoreModel) {
      // at the very end of the job, reload the full model just in case there are
      // any jitters in the chart caused by previously loading the model mid job.
        $scope.chartData.model = [];
        reloadModelChart()
          .catch(() => {})
          .then(() => {
            $scope.chartData.percentComplete = 100;
            $scope.$broadcast('render-results');
            $scope.$applyAsync();
          });
      } else {
        $scope.$broadcast('render-results');
        $scope.$applyAsync();
      }
    }

    function reloadModelChart() {
      return mlSingleMetricJobService.loadModelData($scope.formConfig);
    }


    function reloadSwimlane() {
      return mlSingleMetricJobService.loadSwimlaneData($scope.formConfig);
    }

    function adjustRefreshInterval(loadingDifference, currentInterval) {
      const INTERVAL_INCREASE_MS = 100;
      const MAX_INTERVAL = 10000;
      let interval = currentInterval;

      if (interval < MAX_INTERVAL) {
        if (loadingDifference < MAX_BUCKET_DIFF) {
          interval = interval + INTERVAL_INCREASE_MS;
        } else {
          if ((interval - INTERVAL_INCREASE_MS) >= REFRESH_INTERVAL_MS) {
            interval = interval - INTERVAL_INCREASE_MS;
          }
        }
      }
      return interval;
    }

    $scope.resetJob = function () {
      $scope.jobState = JOB_STATE.NOT_STARTED;
      angular.element('.model-chart, .swimlane').css('opacity', 0);

      _.each(jobProgressChecks, (c, i) => {
        jobProgressChecks[i] = false;
      });

      window.setTimeout(() => {
        $scope.ui.showJobInput = true;
        $scope.loadVis();
      }, 500);

    };

    $scope.stopJob = function () {
    // setting the state to STOPPING disables the stop button
      $scope.jobState = JOB_STATE.STOPPING;
      mlSingleMetricJobService.stopDatafeed($scope.formConfig);
    };

    $scope.moveToAdvancedJobCreation = function () {
      const job = mlSingleMetricJobService.getJobFromConfig($scope.formConfig);
      moveToAdvancedJobCreation(job);
    };

    $scope.$listenAndDigestAsync(timefilter, 'fetch', $scope.loadVis);

    $scope.$on('$destroy', () => {
      globalForceStop = true;
    });

    $scope.$evalAsync(() => {
      preLoadJob($scope, appState);
    });

  });
