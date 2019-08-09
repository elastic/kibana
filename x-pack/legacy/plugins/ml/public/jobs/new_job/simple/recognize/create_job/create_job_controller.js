/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import angular from 'angular';
import 'ui/angular_ui_select';
import dateMath from '@elastic/datemath';
import { isJobIdValid, prefixDatafeedId } from 'plugins/ml/../common/util/job_utils';
import { getCreateRecognizerJobBreadcrumbs } from 'plugins/ml/jobs/breadcrumbs';
import { SearchItemsProvider, addNewJobToRecentlyAccessed } from 'plugins/ml/jobs/new_job/utils/new_job_utils';


import uiRoutes from 'ui/routes';
import { checkViewOrCreateJobs } from '../check_module';
import { checkLicenseExpired } from 'plugins/ml/license/check_license';
import { checkCreateJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import { loadCurrentIndexPattern, loadCurrentSavedSearch } from 'plugins/ml/util/index_utils';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { mlJobService } from 'plugins/ml/services/job_service';
import { CreateRecognizerJobsServiceProvider } from './create_job_service';
import { mlMessageBarService } from 'plugins/ml/components/messagebar/messagebar_service';
import { ml } from 'plugins/ml/services/ml_api_service';
import template from './create_job.html';
import { toastNotifications } from 'ui/notify';
import { timefilter } from 'ui/timefilter';

uiRoutes
  .when('/jobs/new_job/simple/recognize', {
    template,
    k7Breadcrumbs: getCreateRecognizerJobBreadcrumbs,
    resolve: {
      CheckLicense: checkLicenseExpired,
      privileges: checkCreateJobsPrivilege,
      indexPattern: loadCurrentIndexPattern,
      savedSearch: loadCurrentSavedSearch,
      checkMlNodesAvailable,
    }
  });

uiRoutes
  .when('/modules/check_view_or_create', {
    template,
    resolve: {
      checkViewOrCreateJobs
    }
  });


import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module
  .controller('MlCreateRecognizerJobs', function ($scope, $route, Private) {

    const mlCreateRecognizerJobsService = Private(CreateRecognizerJobsServiceProvider);
    timefilter.disableTimeRangeSelector();
    timefilter.disableAutoRefreshSelector();
    const msgs = mlMessageBarService;

    const SAVE_STATE = {
      NOT_SAVED: 0,
      SAVING: 1,
      SAVED: 2,
      FAILED: 3,
      PARTIAL_FAILURE: 4
    };

    const DATAFEED_STATE = {
      NOT_STARTED: 0,
      STARTING: 1,
      STARTED: 2,
      FINISHED: 3,
      STOPPING: 4,
      FAILED: 5
    };

    $scope.addNewJobToRecentlyAccessed = addNewJobToRecentlyAccessed;

    $scope.SAVE_STATE = SAVE_STATE;
    $scope.DATAFEED_STATE = DATAFEED_STATE;

    $scope.overallState = SAVE_STATE.NOT_SAVED;

    const moduleId = $route.current.params.id;
    $scope.moduleId = moduleId;

    const createSearchItems = Private(SearchItemsProvider);
    const {
      indexPattern,
      savedSearch,
      combinedQuery } = createSearchItems();

    const pageTitle = (savedSearch.id !== undefined) ?
      i18n.translate('xpack.ml.newJob.simple.recognize.savedSearchPageTitle', {
        defaultMessage: 'saved search {savedSearchTitle}',
        values: { savedSearchTitle: savedSearch.title }
      }) :
      i18n.translate('xpack.ml.newJob.simple.recognize.indexPatternPageTitle', {
        defaultMessage: 'index pattern {indexPatternTitle}',
        values: { indexPatternTitle: indexPattern.title }
      });

    $scope.displayQueryWarning = (savedSearch.id !== undefined);

    $scope.hideAdvancedButtonAriaLabel = i18n.translate('xpack.ml.newJob.simple.recognize.hideAdvancedButtonAriaLabel', {
      defaultMessage: 'Hide Advanced'
    });
    $scope.showAdvancedButtonAriaLabel = i18n.translate('xpack.ml.newJob.simple.recognize.showAdvancedButtonAriaLabel', {
      defaultMessage: 'Show Advanced'
    });
    $scope.showAdvancedAriaLabel = i18n.translate('xpack.ml.newJob.simple.recognize.showAdvancedAriaLabel', {
      defaultMessage: 'Show advanced'
    });

    $scope.ui = {
      formValid: true,
      indexPattern,
      pageTitle,
      showJobInput: true,
      numberOfJobs: 0,
      kibanaLabels: {
        dashboard: i18n.translate('xpack.ml.newJob.simple.recognize.dashboardsLabel', {
          defaultMessage: 'Dashboards'
        }),
        search: i18n.translate('xpack.ml.newJob.simple.recognize.searchesLabel', {
          defaultMessage: 'Searches'
        }),
        visualization: i18n.translate('xpack.ml.newJob.simple.recognize.visualizationsLabel', {
          defaultMessage: 'Visualizations'
        }),
      },
      validation: {
        checks: {
          jobLabel: { valid: true },
          groupIds: { valid: true }
        },
      },
    };

    $scope.formConfig = {
      indexPattern,
      jobLabel: '',
      jobGroups: [],
      jobs: [],
      kibanaObjects: {},
      start: 0,
      end: 0,
      useFullIndexData: true,
      startDatafeedAfterSave: true,
      useDedicatedIndex: false,
    };

    $scope.resultsUrl = '';

    $scope.resetJob = function () {
      $scope.overallState = SAVE_STATE.NOT_SAVED;
      $scope.formConfig.jobs = [];
      $scope.formConfig.kibanaObjects = {};

      loadJobConfigs();
    };

    function loadJobConfigs() {
      // load the job and datafeed configs as well as the kibana saved objects
      // from the recognizer endpoint
      ml.getDataRecognizerModule({ moduleId })
        .then(resp => {
          // populate the jobs and datafeeds
          if (resp.jobs && resp.jobs.length) {

            const tempGroups = {};

            resp.jobs.forEach((job) => {
              $scope.formConfig.jobs.push({
                id: job.id,
                jobConfig: job.config,
                jobState: SAVE_STATE.NOT_SAVED,
                datafeedId: null,
                datafeedConfig: {},
                datafeedState: SAVE_STATE.NOT_SAVED,
                runningState: DATAFEED_STATE.NOT_STARTED,
                errors: []
              });
              $scope.ui.numberOfJobs++;

              // read the groups list from each job and create a deduplicated jobGroups list
              if (job.config.groups && job.config.groups.length) {
                job.config.groups.forEach((group) => {
                  tempGroups[group] = null;
                });
              }
            });
            $scope.formConfig.jobGroups = Object.keys(tempGroups);

            resp.datafeeds.forEach((datafeed) => {
              const job = _.find($scope.formConfig.jobs, { id: datafeed.config.job_id });
              if (job !== undefined) {
                const datafeedId = mlJobService.getDatafeedId(job.id);
                job.datafeedId = datafeedId;
                job.datafeedConfig = datafeed.config;
              }
            });
          }
          // populate the kibana saved objects
          if (resp.kibana) {
            _.each(resp.kibana, (obj, key) => {
              $scope.formConfig.kibanaObjects[key] = obj.map((o) => {
                return {
                  id: o.id,
                  title: o.title,
                  saveState: SAVE_STATE.NOT_SAVED,
                  config: o.config,
                  exists: false,
                  errors: [],
                };
              });
            });
            // check to see if any of the saved objects already exist.
            // if they do, they are marked as such and greyed out.
            checkIfKibanaObjectsExist($scope.formConfig.kibanaObjects);
          }
          $scope.$applyAsync();
        });
    }

    // toggle kibana's timepicker
    $scope.changeUseFullIndexData = function () {
      const shouldEnableTimeFilter = !$scope.formConfig.useFullIndexData;
      if (shouldEnableTimeFilter) {
        timefilter.enableTimeRangeSelector();
      } else {
        timefilter.disableTimeRangeSelector();
      }
      $scope.$applyAsync();
    };

    $scope.changeJobLabelCase = function () {
      $scope.formConfig.jobLabel = $scope.formConfig.jobLabel.toLowerCase();
    };

    $scope.save = function () {
      if (validateJobs()) {
        msgs.clear();
        $scope.overallState = SAVE_STATE.SAVING;
        angular.element('.results').css('opacity', 1);
        // wait 500ms for the results section to fade in.
        window.setTimeout(() => {
          // save jobs,datafeeds and kibana savedObjects
          saveDataRecognizerItems()
            .then(() => {
              // open jobs and save start datafeeds
              if ($scope.formConfig.startDatafeedAfterSave) {
                startDatafeeds()
                  .then(() => {
                    // everything saved correctly and datafeeds have started.
                    $scope.setOverallState();
                  }).catch(() => {
                    $scope.setOverallState();
                  });
              } else {
                // datafeeds didn't need to be started so finish
                $scope.setOverallState();
              }
            });
        }, 500);
      }
    };

    // call the the setupModuleConfigs endpoint to create the jobs, datafeeds and saved objects
    function saveDataRecognizerItems() {
      return new Promise((resolve) => {
      // set all jobs, datafeeds and saved objects to a SAVING state
      // i.e. display spinners
        setAllToSaving();

        const prefix = $scope.formConfig.jobLabel;
        const indexPatternName = $scope.formConfig.indexPattern.title;
        const groups = $scope.formConfig.jobGroups;
        const useDedicatedIndex = $scope.formConfig.useDedicatedIndex;
        const tempQuery = (savedSearch.id === undefined) ?
          undefined : combinedQuery;

        ml.setupDataRecognizerConfig({ moduleId, prefix, groups, query: tempQuery, indexPatternName, useDedicatedIndex })
          .then((resp) => {
            if (resp.jobs) {
              $scope.formConfig.jobs.forEach((job) => {
                // check results from saving the jobs
                const jobId = `${prefix}${job.id}`;
                const jobResult = resp.jobs.find(j => j.id === jobId);
                if (jobResult !== undefined) {
                  if (jobResult.success) {
                    job.jobState = SAVE_STATE.SAVED;
                  } else {
                    job.jobState = SAVE_STATE.FAILED;
                    if (jobResult.error && jobResult.error.msg) {
                      job.errors.push(jobResult.error.msg);
                    }
                  }
                } else {
                  job.jobState = SAVE_STATE.FAILED;
                  job.errors.push(
                    i18n.translate('xpack.ml.newJob.simple.recognize.job.couldNotSaveJobErrorMessage', {
                      defaultMessage: 'Could not save job {jobId}',
                      values: { jobId }
                    })
                  );
                }

                // check results from saving the datafeeds
                const datafeedId = prefixDatafeedId(job.datafeedId, prefix);
                const datafeedResult = resp.datafeeds.find(d => d.id === datafeedId);
                if (datafeedResult !== undefined) {
                  if (datafeedResult.success) {
                    job.datafeedState = SAVE_STATE.SAVED;
                  } else {
                    job.datafeedState = SAVE_STATE.FAILED;
                    if (datafeedResult.error && datafeedResult.error.msg) {
                      job.errors.push(datafeedResult.error.msg);
                    }
                  }
                } else {
                  job.datafeedState = SAVE_STATE.FAILED;
                  job.errors.push(
                    i18n.translate('xpack.ml.newJob.simple.recognize.datafeed.couldNotSaveDatafeedErrorMessage', {
                      defaultMessage: 'Could not save datafeed {datafeedId}',
                      values: { datafeedId }
                    })
                  );
                }
                $scope.$applyAsync();
              });
            }

            if (resp.kibana) {
              _.each($scope.formConfig.kibanaObjects, (kibanaObject, objName) => {
                kibanaObject.forEach((obj) => {
                  // check the results from saving the saved objects
                  const kibanaObjectResult = resp.kibana[objName].find(o => o.id === obj.id);
                  if (kibanaObjectResult !== undefined) {
                    if (kibanaObjectResult.success || kibanaObjectResult.success === false && kibanaObjectResult.exists === true) {
                      obj.saveState = SAVE_STATE.SAVED;
                    } else {
                      obj.saveState = SAVE_STATE.FAILED;
                      if (kibanaObjectResult.error && kibanaObjectResult.error.message) {
                        obj.errors.push(kibanaObjectResult.error.message);
                      }
                    }
                  } else {
                    obj.saveState = SAVE_STATE.FAILED;
                    obj.errors.push(
                      i18n.translate('xpack.ml.newJob.simple.recognize.kibanaObject.couldNotSaveErrorMessage', {
                        defaultMessage: 'Could not save {objName} {objId}',
                        values: { objName, objId: obj.id }
                      })
                    );
                  }
                  $scope.$applyAsync();
                });
              });
            }
            resolve();
          })
          .catch((err) => {
            console.log('Error setting up module', err);
            toastNotifications.addWarning({
              title: i18n.translate('xpack.ml.newJob.simple.recognize.moduleSetupFailedWarningTitle', {
                defaultMessage: 'Error setting up module {moduleId}',
                values: { moduleId }
              }),
              text: i18n.translate('xpack.ml.newJob.simple.recognize.moduleSetupFailedWarningDescription', {
                defaultMessage: 'An error occurred trying to create the {count, plural, one {job} other {jobs}} in the module.',
                values: {
                  count: $scope.formConfig.jobs.length
                }
              })
            });
            $scope.overallState = SAVE_STATE.FAILED;
            $scope.$applyAsync();
          });
      });
    }

    // loop through all jobs, datafeeds and saved objects and set the save state to SAVING
    function setAllToSaving() {
      $scope.formConfig.jobs.forEach((j) => {
        j.jobState = SAVE_STATE.SAVING;
        j.datafeedState = SAVE_STATE.SAVING;
      });

      _.each($scope.formConfig.kibanaObjects, (kibanaObject) => {
        kibanaObject.forEach((obj) => {
          obj.saveState = SAVE_STATE.SAVING;
        });
      });
      $scope.$applyAsync();
    }

    function startDatafeeds() {
      return new Promise((resolve, reject) => {

        const jobs = $scope.formConfig.jobs;
        const numberOfJobs = jobs.length;

        mlCreateRecognizerJobsService.indexTimeRange($scope.formConfig.indexPattern, $scope.formConfig)
          .then((resp) => {
            if ($scope.formConfig.useFullIndexData) {
              $scope.formConfig.start = resp.start.epoch;
              $scope.formConfig.end = resp.end.epoch;
            } else {
              $scope.formConfig.start = dateMath.parse(timefilter.getTime().from).valueOf();
              $scope.formConfig.end = dateMath.parse(timefilter.getTime().to).valueOf();
            }
            let jobsCounter = 0;
            let datafeedCounter = 0;

            open(jobs[jobsCounter]);

            function incrementAndOpen(job) {
              jobsCounter++;
              if (jobsCounter < numberOfJobs) {
                open(jobs[jobsCounter]);
              } else {
                // if the last job failed, reject out of the function
                // so it can be caught higher up
                if (job.runningState === DATAFEED_STATE.FAILED) {
                  reject();
                }
              }
            }

            function open(job) {
              if (job.jobState === SAVE_STATE.FAILED) {
                // we're skipping over the datafeed, so bump the
                // counter up manually so it all tallies at the end.
                datafeedCounter++;
                job.runningState = DATAFEED_STATE.FAILED;
                incrementAndOpen(job);
                return;
              }
              job.runningState = DATAFEED_STATE.STARTING;
              const jobId = $scope.formConfig.jobLabel + job.id;
              mlJobService.openJob(jobId)
                .then(() => {
                  incrementAndOpen(job);
                  start(job);
                }).catch((err) => {
                  console.log('Opening job failed', err);
                  start(job);
                  job.errors.push(err.message);
                  incrementAndOpen(job);
                });
            }

            function start(job) {
              const jobId = $scope.formConfig.jobLabel + job.id;
              const datafeedId = prefixDatafeedId(job.datafeedId, $scope.formConfig.jobLabel);
              mlCreateRecognizerJobsService.startDatafeed(
                datafeedId,
                jobId,
                $scope.formConfig.start,
                $scope.formConfig.end)
                .then(() => {
                  job.runningState = DATAFEED_STATE.STARTED;
                  datafeedCounter++;
                  if (datafeedCounter === numberOfJobs) {
                    resolve();
                  }
                })
                .catch((err) => {
                  console.log('Starting datafeed failed', err);
                  job.errors.push(err.message);
                  job.runningState = DATAFEED_STATE.FAILED;
                  reject(err);
                })
                .then(() => {
                  $scope.$applyAsync();
                });
            }
          });
      });
    }


    function checkIfKibanaObjectsExist(kibanaObjects) {
      _.each(kibanaObjects, (objects, type) => {
        objects.forEach((obj) => {
          checkForSavedObject(type, obj)
            .then((result) => {
              if (result) {
                obj.saveState = SAVE_STATE.SAVED;
                obj.exists = true;
              }
            });
        });
      });
    }

    function checkForSavedObject(type, savedObject) {
      return new Promise((resolve, reject) => {
        let exists = false;
        mlCreateRecognizerJobsService.loadExistingSavedObjects(type)
          .then((resp) => {
            const savedObjects = resp.savedObjects;
            savedObjects.forEach((obj) => {
              if (savedObject.title === obj.attributes.title) {
                exists = true;
                savedObject.id = obj.id;
              }
            });
            resolve(exists);
          }).catch((resp) => {
            console.log('Could not load saved objects', resp);
            reject(resp);
          });
      });
    }

    $scope.setOverallState = function () {
      const jobIds = [];
      const failedJobsCount = $scope.formConfig.jobs.reduce((count, job) => {
        if (job.jobState === SAVE_STATE.FAILED || job.datafeedState === SAVE_STATE.FAILED) {
          return count + 1;
        } else {
          jobIds.push(`${$scope.formConfig.jobLabel}${job.id}`);
          return count;
        }
      }, 0);

      if (failedJobsCount) {
        if (failedJobsCount === $scope.formConfig.jobs.length) {
          $scope.overallState = SAVE_STATE.FAILED;
        } else {
          $scope.overallState = SAVE_STATE.PARTIAL_FAILURE;
        }
      } else {
        $scope.overallState = SAVE_STATE.SAVED;
      }

      $scope.resultsUrl = mlJobService.createResultsUrl(
        jobIds,
        $scope.formConfig.start,
        $scope.formConfig.end,
        'explorer'
      );

      $scope.$applyAsync();
    };


    function validateJobs() {
      let valid = true;
      const checks = $scope.ui.validation.checks;
      _.each(checks, (item) => {
        item.valid = true;
      });

      // add an extra bit to the job label to avoid hitting the rule which states
      // you can't have an id ending in a - or _
      // also to allow an empty label
      const label = `${$scope.formConfig.jobLabel}extra`;



      if (isJobIdValid(label) === false) {
        valid = false;
        checks.jobLabel.valid = false;
        const msg = i18n.translate('xpack.ml.newJob.simple.recognize.jobLabelAllowedCharactersDescription', {
          defaultMessage: 'Job label can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
          'must start and end with an alphanumeric character'
        });
        checks.jobLabel.message = msg;
      }
      $scope.formConfig.jobGroups.forEach(group => {
        if (isJobIdValid(group) === false) {
          valid = false;
          checks.groupIds.valid = false;
          const msg = i18n.translate('xpack.ml.newJob.simple.recognize.jobGroupAllowedCharactersDescription', {
            defaultMessage: 'Job group names can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
            'must start and end with an alphanumeric character'
          });
          checks.groupIds.message = msg;
        }
      });
      return valid;
    }

    loadJobConfigs();

  });
