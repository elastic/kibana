/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import angular from 'angular';
import moment from 'moment';
import { i18n } from '@kbn/i18n';

import { ml } from './ml_api_service';

import { mlMessageBarService } from '../components/messagebar';
import { isWebUrl } from '../util/url_utils';
import { ML_DATA_PREVIEW_COUNT } from '../../../common/util/job_utils';
import { parseInterval } from '../../../common/util/parse_interval';

const msgs = mlMessageBarService;
let jobs = [];
let datafeedIds = {};

class JobService {
  constructor() {
    // tempJobCloningObjects -> used to pass a job object between the job management page and
    // and the advanced wizard.
    // if populated when loading the advanced wizard, the job is used for cloning.
    // if populated when loading the job management page, the start datafeed modal
    // is automatically opened.
    this.tempJobCloningObjects = {
      job: undefined,
      skipTimeRangeStep: false,
      start: undefined,
      end: undefined,
      calendars: undefined,
    };

    this.jobs = [];

    // Provide ready access to widely used basic job properties.
    // Note these get populated on a call to loadJobs.
    this.basicJobs = {};
    this.jobDescriptions = {};
    this.detectorsByJob = {};
    this.customUrlsByJob = {};
    this.jobStats = {
      activeNodes: {
        label: i18n.translate('xpack.ml.jobService.activeMLNodesLabel', {
          defaultMessage: 'Active ML Nodes',
        }),
        value: 0,
        show: true,
      },
      total: {
        label: i18n.translate('xpack.ml.jobService.totalJobsLabel', {
          defaultMessage: 'Total jobs',
        }),
        value: 0,
        show: true,
      },
      open: {
        label: i18n.translate('xpack.ml.jobService.openJobsLabel', {
          defaultMessage: 'Open jobs',
        }),
        value: 0,
        show: true,
      },
      closed: {
        label: i18n.translate('xpack.ml.jobService.closedJobsLabel', {
          defaultMessage: 'Closed jobs',
        }),
        value: 0,
        show: true,
      },
      failed: {
        label: i18n.translate('xpack.ml.jobService.failedJobsLabel', {
          defaultMessage: 'Failed jobs',
        }),
        value: 0,
        show: false,
      },
      activeDatafeeds: {
        label: i18n.translate('xpack.ml.jobService.activeDatafeedsLabel', {
          defaultMessage: 'Active datafeeds',
        }),
        value: 0,
        show: true,
      },
    };
  }

  getBlankJob() {
    return {
      job_id: '',
      description: '',
      groups: [],
      analysis_config: {
        bucket_span: '15m',
        influencers: [],
        detectors: [],
      },
      data_description: {
        time_field: '',
        time_format: '', // 'epoch',
        field_delimiter: '',
        quote_character: '"',
        format: 'delimited',
      },
    };
  }

  loadJobs() {
    return new Promise((resolve, reject) => {
      jobs = [];
      datafeedIds = {};

      ml.getJobs()
        .then(resp => {
          // make deep copy of jobs
          angular.copy(resp.jobs, jobs);

          // load jobs stats
          ml.getJobStats()
            .then(statsResp => {
              // merge jobs stats into jobs
              for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                // create empty placeholders for stats and datafeed objects
                job.data_counts = {};
                job.model_size_stats = {};
                job.datafeed_config = {};

                for (let j = 0; j < statsResp.jobs.length; j++) {
                  if (job.job_id === statsResp.jobs[j].job_id) {
                    const jobStats = angular.copy(statsResp.jobs[j]);

                    job.state = jobStats.state;
                    job.data_counts = jobStats.data_counts;
                    job.model_size_stats = jobStats.model_size_stats;
                    if (jobStats.node) {
                      job.node = jobStats.node;
                    }
                    if (jobStats.open_time) {
                      job.open_time = jobStats.open_time;
                    }
                  }
                }
              }
              this.loadDatafeeds().then(datafeedsResp => {
                for (let i = 0; i < jobs.length; i++) {
                  for (let j = 0; j < datafeedsResp.datafeeds.length; j++) {
                    if (jobs[i].job_id === datafeedsResp.datafeeds[j].job_id) {
                      jobs[i].datafeed_config = datafeedsResp.datafeeds[j];

                      datafeedIds[jobs[i].job_id] = datafeedsResp.datafeeds[j].datafeed_id;
                    }
                  }
                }
                processBasicJobInfo(this, jobs);
                this.jobs = jobs;
                createJobStats(this.jobs, this.jobStats);
                resolve({ jobs: this.jobs });
              });
            })
            .catch(err => {
              error(err);
            });
        })
        .catch(err => {
          error(err);
        });

      function error(err) {
        console.log('jobService error getting list of jobs:', err);
        msgs.error(
          i18n.translate('xpack.ml.jobService.jobsListCouldNotBeRetrievedErrorMessage', {
            defaultMessage: 'Jobs list could not be retrieved',
          })
        );
        msgs.error('', err);
        reject({ jobs, err });
      }
    });
  }

  loadJobsWrapper = () => {
    return this.loadJobs()
      .then(function(resp) {
        return resp;
      })
      .catch(function(error) {
        console.log('Error loading jobs in route resolve.', error);
        // Always resolve to ensure tab still works.
        Promise.resolve([]);
      });
  };

  refreshJob(jobId) {
    return new Promise((resolve, reject) => {
      ml.getJobs({ jobId })
        .then(resp => {
          const newJob = {};
          if (resp.jobs && resp.jobs.length) {
            angular.copy(resp.jobs[0], newJob);

            // load jobs stats
            ml.getJobStats({ jobId })
              .then(statsResp => {
                // merge jobs stats into jobs
                for (let j = 0; j < statsResp.jobs.length; j++) {
                  if (newJob.job_id === statsResp.jobs[j].job_id) {
                    const statsJob = statsResp.jobs[j];
                    newJob.state = statsJob.state;
                    newJob.data_counts = {};
                    newJob.model_size_stats = {};
                    angular.copy(statsJob.data_counts, newJob.data_counts);
                    angular.copy(statsJob.model_size_stats, newJob.model_size_stats);
                    if (newJob.node) {
                      angular.copy(statsJob.node, newJob.node);
                    }

                    if (statsJob.open_time) {
                      newJob.open_time = statsJob.open_time;
                    }
                  }
                }

                // replace the job in the jobs array
                for (let i = 0; i < jobs.length; i++) {
                  if (jobs[i].job_id === newJob.job_id) {
                    jobs[i] = newJob;
                  }
                }

                const datafeedId = this.getDatafeedId(jobId);

                this.loadDatafeeds(datafeedId).then(datafeedsResp => {
                  for (let i = 0; i < jobs.length; i++) {
                    for (let j = 0; j < datafeedsResp.datafeeds.length; j++) {
                      if (jobs[i].job_id === datafeedsResp.datafeeds[j].job_id) {
                        jobs[i].datafeed_config = datafeedsResp.datafeeds[j];

                        datafeedIds[jobs[i].job_id] = datafeedsResp.datafeeds[j].datafeed_id;
                      }
                    }
                  }
                  this.jobs = jobs;
                  createJobStats(this.jobs, this.jobStats);
                  resolve({ jobs: this.jobs });
                });
              })
              .catch(err => {
                error(err);
              });
          }
        })
        .catch(err => {
          error(err);
        });

      function error(err) {
        console.log('JobService error getting list of jobs:', err);
        msgs.error(
          i18n.translate('xpack.ml.jobService.jobsListCouldNotBeRetrievedErrorMessage', {
            defaultMessage: 'Jobs list could not be retrieved',
          })
        );
        msgs.error('', err);
        reject({ jobs, err });
      }
    });
  }

  loadDatafeeds(datafeedId) {
    return new Promise((resolve, reject) => {
      const datafeeds = [];
      const sId = datafeedId !== undefined ? { datafeed_id: datafeedId } : undefined;

      ml.getDatafeeds(sId)
        .then(resp => {
          // console.log('loadDatafeeds query response:', resp);

          // make deep copy of datafeeds
          angular.copy(resp.datafeeds, datafeeds);

          // load datafeeds stats
          ml.getDatafeedStats()
            .then(statsResp => {
              // merge datafeeds stats into datafeeds
              for (let i = 0; i < datafeeds.length; i++) {
                const datafeed = datafeeds[i];
                for (let j = 0; j < statsResp.datafeeds.length; j++) {
                  if (datafeed.datafeed_id === statsResp.datafeeds[j].datafeed_id) {
                    datafeed.state = statsResp.datafeeds[j].state;
                  }
                }
              }
              resolve({ datafeeds });
            })
            .catch(err => {
              error(err);
            });
        })
        .catch(err => {
          error(err);
        });

      function error(err) {
        console.log('loadDatafeeds error getting list of datafeeds:', err);
        msgs.error(
          i18n.translate('xpack.ml.jobService.datafeedsListCouldNotBeRetrievedErrorMessage', {
            defaultMessage: 'datafeeds list could not be retrieved',
          })
        );
        msgs.error('', err);
        reject({ jobs, err });
      }
    });
  }

  updateSingleJobDatafeedState(jobId) {
    return new Promise((resolve, reject) => {
      const datafeedId = this.getDatafeedId(jobId);

      ml.getDatafeedStats({ datafeedId })
        .then(resp => {
          // console.log('updateSingleJobCounts controller query response:', resp);
          const datafeeds = resp.datafeeds;
          let state = 'UNKNOWN';
          if (datafeeds && datafeeds.length) {
            state = datafeeds[0].state;
          }
          resolve(state);
        })
        .catch(resp => {
          reject(resp);
        });
    });
  }

  saveNewJob(job) {
    // run then and catch through the same check
    function func(resp) {
      console.log('Response for job query:', resp);
      const success = checkSaveResponse(resp, job);
      return { success, job, resp };
    }

    // return the promise chain
    return ml
      .addJob({ jobId: job.job_id, job })
      .then(func)
      .catch(func);
  }

  cloneJob(job) {
    // create a deep copy of a job object
    // also remove items from the job which are set by the server and not needed
    // in the future this formatting could be optional
    const tempJob = angular.copy(job);

    // remove all of the items which should not be copied
    // such as counts, state and times
    delete tempJob.state;
    delete tempJob.job_version;
    delete tempJob.data_counts;
    delete tempJob.create_time;
    delete tempJob.finished_time;
    delete tempJob.last_data_time;
    delete tempJob.model_size_stats;
    delete tempJob.node;
    delete tempJob.average_bucket_processing_time_ms;
    delete tempJob.model_snapshot_id;
    delete tempJob.open_time;
    delete tempJob.established_model_memory;
    delete tempJob.calendars;

    delete tempJob.analysis_config.use_per_partition_normalization;

    _.each(tempJob.analysis_config.detectors, d => {
      delete d.detector_index;
    });

    // remove parts of the datafeed config which should not be copied
    if (tempJob.datafeed_config) {
      delete tempJob.datafeed_config.datafeed_id;
      delete tempJob.datafeed_config.job_id;
      delete tempJob.datafeed_config.state;
      delete tempJob.datafeed_config.node;
      delete tempJob.datafeed_config.timing_stats;

      // remove query_delay if it's between 60s and 120s
      // the back-end produces a random value between 60 and 120 and so
      // by deleting it, the back-end will produce a new random value
      if (tempJob.datafeed_config.query_delay) {
        const interval = parseInterval(tempJob.datafeed_config.query_delay);
        if (interval !== null) {
          const queryDelay = interval.asSeconds();
          if (queryDelay > 60 && queryDelay < 120) {
            delete tempJob.datafeed_config.query_delay;
          }
        }
      }
    }

    // when jumping from a wizard to the advanced job creation,
    // the wizard's created_by information should be stripped.
    if (tempJob.custom_settings && tempJob.custom_settings.created_by) {
      delete tempJob.custom_settings.created_by;
    }

    return tempJob;
  }

  updateJob(jobId, job) {
    // return the promise chain
    return ml
      .updateJob({ jobId, job })
      .then(resp => {
        console.log('update job', resp);
        return { success: true };
      })
      .catch(err => {
        msgs.error(
          i18n.translate('xpack.ml.jobService.couldNotUpdateJobErrorMessage', {
            defaultMessage: 'Could not update job: {jobId}',
            values: { jobId },
          })
        );
        console.log('update job', err);
        return { success: false, message: err.message };
      });
  }

  validateJob(obj) {
    // return the promise chain
    return ml
      .validateJob(obj)
      .then(messages => {
        return { success: true, messages };
      })
      .catch(err => {
        msgs.error(
          i18n.translate('xpack.ml.jobService.jobValidationErrorMessage', {
            defaultMessage: 'Job Validation Error: {errorMessage}',
            values: { errorMessage: err.message },
          })
        );
        console.log('validate job', err);
        return {
          success: false,
          messages: [
            {
              status: 'error',
              text: err.message,
            },
          ],
        };
      });
  }

  // find a job based on the id
  getJob(jobId) {
    const job = _.find(jobs, j => {
      return j.job_id === jobId;
    });

    return job;
  }

  searchPreview(job) {
    return new Promise((resolve, reject) => {
      if (job.datafeed_config) {
        // if query is set, add it to the search, otherwise use match_all
        let query = { match_all: {} };
        if (job.datafeed_config.query) {
          query = job.datafeed_config.query;
        }

        // Get bucket span
        // Get first doc time for datafeed
        // Create a new query - must user query and must range query.
        // Time range 'to' first doc time plus < 10 buckets

        // Do a preliminary search to get the date of the earliest doc matching the
        // query in the datafeed. This will be used to apply a time range criteria
        // on the datafeed search preview.
        // This time filter is required for datafeed searches using aggregations to ensure
        // the search does not create too many buckets (default 10000 max_bucket limit),
        // but apply it to searches without aggregations too for consistency.
        ml.getTimeFieldRange({
          index: job.datafeed_config.indices,
          timeFieldName: job.data_description.time_field,
          query,
        })
          .then(timeRange => {
            const bucketSpan = parseInterval(job.analysis_config.bucket_span);
            const earliestMs = timeRange.start.epoch;
            const latestMs = +timeRange.start.epoch + 10 * bucketSpan.asMilliseconds();

            const body = {
              query: {
                bool: {
                  must: [
                    {
                      range: {
                        [job.data_description.time_field]: {
                          gte: earliestMs,
                          lt: latestMs,
                          format: 'epoch_millis',
                        },
                      },
                    },
                    query,
                  ],
                },
              },
            };

            // if aggs or aggregations is set, add it to the search
            const aggregations = job.datafeed_config.aggs || job.datafeed_config.aggregations;
            if (aggregations && Object.keys(aggregations).length) {
              body.size = 0;
              body.aggregations = aggregations;

              // add script_fields if present
              const scriptFields = job.datafeed_config.script_fields;
              if (scriptFields && Object.keys(scriptFields).length) {
                body.script_fields = scriptFields;
              }
            } else {
              // if aggregations is not set and retrieveWholeSource is not set, add all of the fields from the job
              body.size = ML_DATA_PREVIEW_COUNT;

              // add script_fields if present
              const scriptFields = job.datafeed_config.script_fields;
              if (scriptFields && Object.keys(scriptFields).length) {
                body.script_fields = scriptFields;
              }

              const fields = {};

              // get fields from detectors
              if (job.analysis_config.detectors) {
                _.each(job.analysis_config.detectors, dtr => {
                  if (dtr.by_field_name) {
                    fields[dtr.by_field_name] = {};
                  }
                  if (dtr.field_name) {
                    fields[dtr.field_name] = {};
                  }
                  if (dtr.over_field_name) {
                    fields[dtr.over_field_name] = {};
                  }
                  if (dtr.partition_field_name) {
                    fields[dtr.partition_field_name] = {};
                  }
                });
              }

              // get fields from influencers
              if (job.analysis_config.influencers) {
                _.each(job.analysis_config.influencers, inf => {
                  fields[inf] = {};
                });
              }

              // get fields from categorizationFieldName
              if (job.analysis_config.categorization_field_name) {
                fields[job.analysis_config.categorization_field_name] = {};
              }

              // get fields from summary_count_field_name
              if (job.analysis_config.summary_count_field_name) {
                fields[job.analysis_config.summary_count_field_name] = {};
              }

              // get fields from time_field
              if (job.data_description.time_field) {
                fields[job.data_description.time_field] = {};
              }

              // console.log('fields: ', fields);
              const fieldsList = Object.keys(fields);
              if (fieldsList.length) {
                body._source = fieldsList;
              }
            }

            const data = {
              index: job.datafeed_config.indices,
              body,
            };

            ml.esSearch(data)
              .then(resp => {
                resolve(resp);
              })
              .catch(resp => {
                reject(resp);
              });
          })
          .catch(resp => {
            reject(resp);
          });
      }
    });
  }

  openJob(jobId) {
    return ml.openJob({ jobId });
  }

  closeJob(jobId) {
    return ml.closeJob({ jobId });
  }

  saveNewDatafeed(datafeedConfig, jobId) {
    const datafeedId = `datafeed-${jobId}`;
    datafeedConfig.job_id = jobId;

    return ml.addDatafeed({
      datafeedId,
      datafeedConfig,
    });
  }

  updateDatafeed(datafeedId, datafeedConfig) {
    return ml
      .updateDatafeed({ datafeedId, datafeedConfig })
      .then(resp => {
        console.log('update datafeed', resp);
        return { success: true };
      })
      .catch(err => {
        msgs.error(
          i18n.translate('xpack.ml.jobService.couldNotUpdateDatafeedErrorMessage', {
            defaultMessage: 'Could not update datafeed: {datafeedId}',
            values: { datafeedId },
          })
        );
        console.log('update datafeed', err);
        return { success: false, message: err.message };
      });
  }

  // start the datafeed for a given job
  // refresh the job state on start success
  startDatafeed(datafeedId, jobId, start, end) {
    return new Promise((resolve, reject) => {
      // if the end timestamp is a number, add one ms to it to make it
      // inclusive of the end of the data
      if (_.isNumber(end)) {
        end++;
      }

      ml.startDatafeed({
        datafeedId,
        start,
        end,
      })
        .then(resp => {
          resolve(resp);
        })
        .catch(err => {
          console.log('jobService error starting datafeed:', err);
          msgs.error(
            i18n.translate('xpack.ml.jobService.couldNotStartDatafeedErrorMessage', {
              defaultMessage: 'Could not start datafeed for {jobId}',
              values: { jobId },
            }),
            err
          );
          reject(err);
        });
    });
  }

  // stop the datafeed for a given job
  // refresh the job state on stop success
  stopDatafeed(datafeedId, jobId) {
    return new Promise((resolve, reject) => {
      ml.stopDatafeed({
        datafeedId,
      })
        .then(resp => {
          resolve(resp);
        })
        .catch(err => {
          console.log('jobService error stopping datafeed:', err);
          const couldNotStopDatafeedErrorMessage = i18n.translate(
            'xpack.ml.jobService.couldNotStopDatafeedErrorMessage',
            {
              defaultMessage: 'Could not stop datafeed for {jobId}',
              values: { jobId },
            }
          );

          if (err.statusCode === 500) {
            msgs.error(couldNotStopDatafeedErrorMessage);
            msgs.error(
              i18n.translate('xpack.ml.jobService.requestMayHaveTimedOutErrorMessage', {
                defaultMessage:
                  'Request may have timed out and may still be running in the background.',
              })
            );
          } else {
            msgs.error(couldNotStopDatafeedErrorMessage, err);
          }
          reject(err);
        });
    });
  }

  forceStartDatafeeds(dIds, start, end) {
    return ml.jobs.forceStartDatafeeds(dIds, start, end);
  }

  stopDatafeeds(dIds) {
    return ml.jobs.stopDatafeeds(dIds);
  }

  deleteJobs(jIds) {
    return ml.jobs.deleteJobs(jIds);
  }

  closeJobs(jIds) {
    return ml.jobs.closeJobs(jIds);
  }

  validateDetector(detector) {
    return new Promise((resolve, reject) => {
      if (detector) {
        ml.validateDetector({ detector })
          .then(resp => {
            resolve(resp);
          })
          .catch(resp => {
            reject(resp);
          });
      } else {
        reject({});
      }
    });
  }

  getDatafeedId(jobId) {
    let datafeedId = datafeedIds[jobId];
    if (datafeedId === undefined) {
      datafeedId = `datafeed-${jobId}`;
    }
    return datafeedId;
  }

  getDatafeedPreview(jobId) {
    const datafeedId = this.getDatafeedId(jobId);
    return ml.datafeedPreview({ datafeedId });
  }

  // get the list of job group ids as well as how many jobs are in each group
  getJobGroups() {
    const groups = [];
    const tempGroups = {};
    this.jobs.forEach(job => {
      if (Array.isArray(job.groups)) {
        job.groups.forEach(group => {
          if (tempGroups[group] === undefined) {
            tempGroups[group] = [job];
          } else {
            tempGroups[group].push(job);
          }
        });
      }
    });
    _.each(tempGroups, (js, id) => {
      groups.push({ id, jobs: js });
    });
    return groups;
  }

  createResultsUrlForJobs(jobsList, resultsPage) {
    return createResultsUrlForJobs(jobsList, resultsPage);
  }

  createResultsUrl(jobIds, from, to, resultsPage) {
    return createResultsUrl(jobIds, from, to, resultsPage);
  }

  async getJobAndGroupIds() {
    try {
      return await ml.jobs.getAllJobAndGroupIds();
    } catch (error) {
      return {
        jobIds: [],
        groupIds: [],
      };
    }
  }
}

// private function used to check the job saving response
function checkSaveResponse(resp, origJob) {
  if (resp) {
    if (resp.job_id) {
      if (resp.job_id === origJob.job_id) {
        console.log('checkSaveResponse(): save successful');
        return true;
      }
    } else {
      if (resp.errorCode) {
        console.log('checkSaveResponse(): save failed', resp);
        return false;
      }
    }
  } else {
    console.log('checkSaveResponse(): response is empty');
    return false;
  }
}

function processBasicJobInfo(localJobService, jobsList) {
  // Process the list of job data obtained from the jobs endpoint to return
  // an array of objects containing the basic information (id, description, bucketSpan,
  // and detectors properties, plus a customUrls key if custom URLs
  // have been configured for the job) used by various result dashboards in the ml plugin.
  // The key information is stored in the jobService object for quick access.
  const processedJobsList = [];
  const detectorsByJob = {};
  const customUrlsByJob = {};

  // use cloned copy of jobs list so not to alter the original
  const jobsListCopy = _.cloneDeep(jobsList);

  _.each(jobsListCopy, jobObj => {
    const analysisConfig = jobObj.analysis_config;
    const bucketSpan = parseInterval(analysisConfig.bucket_span);

    const job = {
      id: jobObj.job_id,
      bucketSpanSeconds: bucketSpan.asSeconds(),
    };

    if (_.has(jobObj, 'description') && /^\s*$/.test(jobObj.description) === false) {
      job.description = jobObj.description;
    } else {
      // Just use the id as the description.
      job.description = jobObj.job_id;
    }

    job.detectors = _.get(analysisConfig, 'detectors', []);
    detectorsByJob[job.id] = job.detectors;

    if (_.has(jobObj, 'custom_settings.custom_urls')) {
      job.customUrls = [];
      _.each(jobObj.custom_settings.custom_urls, url => {
        if (_.has(url, 'url_name') && _.has(url, 'url_value') && isWebUrl(url.url_value)) {
          // Only make web URLs (i.e. http or https) available in dashboard drilldowns.
          job.customUrls.push(url);
        }
      });
      // Only add an entry for a job if customUrls have been defined.
      if (job.customUrls.length > 0) {
        customUrlsByJob[job.id] = job.customUrls;
      }
    }

    localJobService.jobDescriptions[job.id] = job.description;
    localJobService.basicJobs[job.id] = job;
    processedJobsList.push(job);
  });

  localJobService.detectorsByJob = detectorsByJob;
  localJobService.customUrlsByJob = customUrlsByJob;

  return processedJobsList;
}

// Loop through the jobs list and create basic stats
// stats are displayed along the top of the Jobs Management page
function createJobStats(jobsList, jobStats) {
  jobStats.activeNodes.value = 0;
  jobStats.total.value = 0;
  jobStats.open.value = 0;
  jobStats.closed.value = 0;
  jobStats.failed.value = 0;
  jobStats.activeDatafeeds.value = 0;

  // object to keep track of nodes being used by jobs
  const mlNodes = {};
  let failedJobs = 0;

  _.each(jobsList, job => {
    if (job.state === 'opened') {
      jobStats.open.value++;
    } else if (job.state === 'closed') {
      jobStats.closed.value++;
    } else if (job.state === 'failed') {
      failedJobs++;
    }

    if (job.datafeed_config && job.datafeed_config.state === 'started') {
      jobStats.activeDatafeeds.value++;
    }

    if (job.node && job.node.name) {
      mlNodes[job.node.name] = {};
    }
  });

  jobStats.total.value = jobsList.length;

  // // Only show failed jobs if it is non-zero
  if (failedJobs) {
    jobStats.failed.value = failedJobs;
    jobStats.failed.show = true;
  } else {
    jobStats.failed.show = false;
  }

  jobStats.activeNodes.value = Object.keys(mlNodes).length;
}

function createResultsUrlForJobs(jobsList, resultsPage) {
  let from = undefined;
  let to = undefined;
  if (jobsList.length === 1) {
    from = jobsList[0].earliestTimestampMs;
    to = jobsList[0].latestResultsTimestampMs; // Will be max(latest source data, latest bucket results)
  } else {
    const jobsWithData = jobsList.filter(j => j.earliestTimestampMs !== undefined);
    if (jobsWithData.length > 0) {
      from = Math.min(...jobsWithData.map(j => j.earliestTimestampMs));
      to = Math.max(...jobsWithData.map(j => j.latestResultsTimestampMs));
    }
  }

  const timeFormat = 'YYYY-MM-DD HH:mm:ss';

  const fromString = moment(from).format(timeFormat); // Defaults to 'now' if 'from' is undefined
  const toString = moment(to).format(timeFormat); // Defaults to 'now' if 'to' is undefined

  const jobIds = jobsList.map(j => j.id);
  return createResultsUrl(jobIds, fromString, toString, resultsPage);
}

function createResultsUrl(jobIds, start, end, resultsPage) {
  const idString = jobIds.map(j => `'${j}'`).join(',');
  const from = moment(start).toISOString();
  const to = moment(end).toISOString();
  let path = '';

  if (resultsPage !== undefined) {
    path += '#/';
    path += resultsPage;
  }

  path += `?_g=(ml:(jobIds:!(${idString}))`;
  path += `,refreshInterval:(display:Off,pause:!f,value:0),time:(from:'${from}'`;
  path += `,mode:absolute,to:'${to}'`;
  path += "))&_a=(query:(query_string:(analyze_wildcard:!t,query:'*')))";

  return path;
}

export const mlJobService = new JobService();
