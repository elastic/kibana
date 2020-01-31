/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import Boom from 'boom';
import numeral from '@elastic/numeral';
import { merge, get } from 'lodash';
import { getLatestDataOrBucketTimestamp, prefixDatafeedId } from '../../../common/util/job_utils';
import { mlLog } from '../../client/log';
import { jobServiceProvider } from '../job_service';
import { resultsServiceProvider } from '../results_service';

const ML_DIR = 'ml';
const KIBANA_DIR = 'kibana';
const INDEX_PATTERN_ID = 'INDEX_PATTERN_ID';
const INDEX_PATTERN_NAME = 'INDEX_PATTERN_NAME';
export const SAVED_OBJECT_TYPES = {
  DASHBOARD: 'dashboard',
  SEARCH: 'search',
  VISUALIZATION: 'visualization',
};

export class DataRecognizer {
  constructor(callWithRequest) {
    this.callWithRequest = callWithRequest;
    this.modulesDir = `${__dirname}/modules`;
    this.savedObjectsClient = null;
  }

  // list all directories under the given directory
  async listDirs(dirName) {
    const dirs = [];
    return new Promise((resolve, reject) => {
      fs.readdir(dirName, (err, fileNames) => {
        if (err) {
          reject(err);
        }
        fileNames.forEach(fileName => {
          const path = `${dirName}/${fileName}`;
          if (fs.lstatSync(path).isDirectory()) {
            dirs.push(fileName);
          }
        });
        resolve(dirs);
      });
    });
  }

  async readFile(fileName) {
    return new Promise((resolve, reject) => {
      fs.readFile(fileName, 'utf-8', (err, content) => {
        if (err) {
          reject(err);
        } else {
          resolve(content);
        }
      });
    });
  }

  async loadManifestFiles() {
    const configs = [];
    const dirs = await this.listDirs(this.modulesDir);
    await Promise.all(
      dirs.map(async dir => {
        let file;
        try {
          file = await this.readFile(`${this.modulesDir}/${dir}/manifest.json`);
        } catch (error) {
          mlLog.warn(`Data recognizer skipping folder ${dir} as manifest.json cannot be read`);
        }

        if (file !== undefined) {
          try {
            configs.push({
              dirName: dir,
              json: JSON.parse(file),
            });
          } catch (error) {
            mlLog.warn(`Data recognizer error parsing ${dir}/manifest.json. ${error}`);
          }
        }
      })
    );

    return configs;
  }

  // get the manifest.json file for a specified id, e.g. "nginx"
  async getManifestFile(id) {
    const manifestFiles = await this.loadManifestFiles();
    return manifestFiles.find(i => i.json.id === id);
  }

  // called externally by an endpoint
  async findMatches(indexPattern) {
    const manifestFiles = await this.loadManifestFiles();
    const results = [];

    await Promise.all(
      manifestFiles.map(async i => {
        const moduleConfig = i.json;
        let match = false;
        try {
          match = await this.searchForFields(moduleConfig, indexPattern);
        } catch (error) {
          mlLog.warn(
            `Data recognizer error running query defined for module ${moduleConfig.id}. ${error}`
          );
        }

        if (match === true) {
          let logo = null;
          if (moduleConfig.logoFile) {
            try {
              logo = await this.readFile(
                `${this.modulesDir}/${i.dirName}/${moduleConfig.logoFile}`
              );
              logo = JSON.parse(logo);
            } catch (e) {
              logo = null;
            }
          }
          results.push({
            id: moduleConfig.id,
            title: moduleConfig.title,
            query: moduleConfig.query,
            description: moduleConfig.description,
            logo,
          });
        }
      })
    );

    return results;
  }

  async searchForFields(moduleConfig, indexPattern) {
    if (moduleConfig.query === undefined) {
      return false;
    }

    const index = indexPattern;
    const size = 0;
    const body = {
      query: moduleConfig.query,
    };

    const resp = await this.callWithRequest('search', {
      index,
      rest_total_hits_as_int: true,
      size,
      body,
    });

    return resp.hits.total !== 0;
  }

  async listModules() {
    const manifestFiles = await this.loadManifestFiles();
    const ids = manifestFiles.map(({ json }) => json.id).sort((a, b) => a.localeCompare(b)); // sort as json files are read from disk and could be in any order.

    const modules = [];
    for (let i = 0; i < ids.length; i++) {
      const module = await this.getModule(ids[i]);
      modules.push(module);
    }
    return modules;
  }

  // called externally by an endpoint
  // supplying an optional prefix will add the prefix
  // to the job and datafeed configs
  async getModule(id, prefix = '') {
    let manifestJSON = null;
    let dirName = null;

    const manifestFile = await this.getManifestFile(id);
    if (manifestFile !== undefined) {
      manifestJSON = manifestFile.json;
      dirName = manifestFile.dirName;
    } else {
      throw Boom.notFound(`Module with the id "${id}" not found`);
    }

    const jobs = [];
    const datafeeds = [];
    const kibana = {};
    // load all of the job configs
    await Promise.all(
      manifestJSON.jobs.map(async job => {
        try {
          const jobConfig = await this.readFile(
            `${this.modulesDir}/${dirName}/${ML_DIR}/${job.file}`
          );
          // use the file name for the id
          jobs.push({
            id: `${prefix}${job.id}`,
            config: JSON.parse(jobConfig),
          });
        } catch (error) {
          mlLog.warn(
            `Data recognizer error loading config for job ${job.id} for module ${id}. ${error}`
          );
        }
      })
    );

    // load all of the datafeed configs
    await Promise.all(
      manifestJSON.datafeeds.map(async datafeed => {
        try {
          const datafeedConfig = await this.readFile(
            `${this.modulesDir}/${dirName}/${ML_DIR}/${datafeed.file}`
          );
          const config = JSON.parse(datafeedConfig);
          // use the job id from the manifestFile
          config.job_id = `${prefix}${datafeed.job_id}`;

          datafeeds.push({
            id: prefixDatafeedId(datafeed.id, prefix),
            config,
          });
        } catch (error) {
          mlLog.warn(
            `Data recognizer error loading config for datafeed ${datafeed.id} for module ${id}. ${error}`
          );
        }
      })
    );

    // load all of the kibana saved objects
    if (manifestJSON.kibana !== undefined) {
      const kKeys = Object.keys(manifestJSON.kibana);
      await Promise.all(
        kKeys.map(async key => {
          kibana[key] = [];
          await Promise.all(
            manifestJSON.kibana[key].map(async obj => {
              try {
                const kConfig = await this.readFile(
                  `${this.modulesDir}/${dirName}/${KIBANA_DIR}/${key}/${obj.file}`
                );
                // use the file name for the id
                const kId = obj.file.replace('.json', '');
                const config = JSON.parse(kConfig);
                kibana[key].push({
                  id: kId,
                  title: config.title,
                  config,
                });
              } catch (error) {
                mlLog.warn(
                  `Data recognizer error loading config for ${key} ${obj.id} for module ${id}. ${error}`
                );
              }
            })
          );
        })
      );
    }

    return {
      ...manifestJSON,
      jobs,
      datafeeds,
      kibana,
    };
  }

  // called externally by an endpoint
  // takes a module config id, an optional jobPrefix and the request object
  // creates all of the jobs, datafeeds and savedObjects  listed in the module config.
  // if any of the savedObjects already exist, they will not be overwritten.
  async setupModuleItems(
    moduleId,
    jobPrefix,
    groups,
    indexPatternName,
    query,
    useDedicatedIndex,
    startDatafeed,
    start,
    end,
    jobOverrides,
    datafeedOverrides,
    request
  ) {
    this.savedObjectsClient = request.getSavedObjectsClient();
    this.indexPatterns = await this.loadIndexPatterns();

    // load the config from disk
    const moduleConfig = await this.getModule(moduleId, jobPrefix);

    if (indexPatternName === undefined && moduleConfig.defaultIndexPattern === undefined) {
      throw Boom.badRequest(
        `No index pattern configured in "${moduleId}" configuration file and no index pattern passed to the endpoint`
      );
    }

    this.indexPatternName =
      indexPatternName === undefined ? moduleConfig.defaultIndexPattern : indexPatternName;
    this.indexPatternId = this.getIndexPatternId(this.indexPatternName);

    // the module's jobs contain custom URLs which require an index patten id
    // but there is no corresponding index pattern, throw an error
    if (this.indexPatternId === undefined && this.doJobUrlsContainIndexPatternId(moduleConfig)) {
      throw Boom.badRequest(
        `Module's jobs contain custom URLs which require a kibana index pattern (${this.indexPatternName}) which cannot be found.`
      );
    }

    // the module's saved objects require an index patten id
    // but there is no corresponding index pattern, throw an error
    if (
      this.indexPatternId === undefined &&
      this.doSavedObjectsContainIndexPatternId(moduleConfig)
    ) {
      throw Boom.badRequest(
        `Module's saved objects contain custom URLs which require a kibana index pattern (${this.indexPatternName}) which cannot be found.`
      );
    }

    // create an empty results object
    const results = this.createResultsTemplate(moduleConfig);
    const saveResults = {
      jobs: [],
      datafeeds: [],
      savedObjects: [],
    };

    this.applyJobConfigOverrides(moduleConfig, jobOverrides, jobPrefix);
    this.applyDatafeedConfigOverrides(moduleConfig, datafeedOverrides, jobPrefix);
    this.updateDatafeedIndices(moduleConfig);
    this.updateJobUrlIndexPatterns(moduleConfig);
    await this.updateModelMemoryLimits(moduleConfig);

    // create the jobs
    if (moduleConfig.jobs && moduleConfig.jobs.length) {
      if (Array.isArray(groups)) {
        // update groups list for each job
        moduleConfig.jobs.forEach(job => (job.config.groups = groups));
      }

      // Set the results_index_name property for each job if useDedicatedIndex is true
      if (useDedicatedIndex === true) {
        moduleConfig.jobs.forEach(job => (job.config.results_index_name = job.id));
      }
      saveResults.jobs = await this.saveJobs(moduleConfig.jobs);
    }

    // create the datafeeds
    if (moduleConfig.datafeeds && moduleConfig.datafeeds.length) {
      if (typeof query === 'object' && query !== null) {
        moduleConfig.datafeeds.forEach(df => {
          df.config.query = query;
        });
      }
      saveResults.datafeeds = await this.saveDatafeeds(moduleConfig.datafeeds);

      if (startDatafeed) {
        const savedDatafeeds = moduleConfig.datafeeds.filter(df => {
          const datafeedResult = saveResults.datafeeds.find(d => d.id === df.id);
          return datafeedResult !== undefined && datafeedResult.success === true;
        });

        const startResults = await this.startDatafeeds(savedDatafeeds, start, end);
        saveResults.datafeeds.forEach(df => {
          const startedDatafeed = startResults[df.id];
          if (startedDatafeed !== undefined) {
            df.started = startedDatafeed.started;
            if (startedDatafeed.error !== undefined) {
              df.error = startedDatafeed.error;
            }
          }
        });
      }
    }

    // create the savedObjects
    if (moduleConfig.kibana) {
      // update the saved objects with the index pattern id
      this.updateSavedObjectIndexPatterns(moduleConfig);

      const savedObjects = await this.createSavedObjectsToSave(moduleConfig);
      // update the exists flag in the results
      this.updateKibanaResults(results.kibana, savedObjects);
      // create the savedObjects
      saveResults.savedObjects = await this.saveKibanaObjects(savedObjects);
    }
    // merge all the save results
    this.updateResults(results, saveResults);
    return results;
  }

  async dataRecognizerJobsExist(moduleId) {
    const results = {};

    // Load the module with the specified ID and check if the jobs
    // in the module have been created.
    const module = await this.getModule(moduleId);
    if (module && module.jobs) {
      // Add a wildcard at the front of each of the job IDs in the module,
      // as a prefix may have been supplied when creating the jobs in the module.
      const jobIds = module.jobs.map(job => `*${job.id}`);
      const { jobsExist } = jobServiceProvider(this.callWithRequest);
      const jobInfo = await jobsExist(jobIds);

      // Check if the value for any of the jobs is false.
      const doJobsExist = Object.values(jobInfo).includes(false) === false;
      results.jobsExist = doJobsExist;

      if (doJobsExist === true) {
        // Get the IDs of the jobs created from the module, and their earliest / latest timestamps.
        const jobStats = await this.callWithRequest('ml.jobStats', { jobId: jobIds });
        const jobStatsJobs = [];
        if (jobStats.jobs && jobStats.jobs.length > 0) {
          const foundJobIds = jobStats.jobs.map(job => job.job_id);
          const { getLatestBucketTimestampByJob } = resultsServiceProvider(this.callWithRequest);
          const latestBucketTimestampsByJob = await getLatestBucketTimestampByJob(foundJobIds);

          jobStats.jobs.forEach(job => {
            const jobStat = {
              id: job.job_id,
            };

            if (job.data_counts) {
              jobStat.earliestTimestampMs = job.data_counts.earliest_record_timestamp;
              jobStat.latestTimestampMs = job.data_counts.latest_record_timestamp;
              jobStat.latestResultsTimestampMs = getLatestDataOrBucketTimestamp(
                jobStat.latestTimestampMs,
                latestBucketTimestampsByJob[job.job_id]
              );
            }
            jobStatsJobs.push(jobStat);
          });
        }
        results.jobs = jobStatsJobs;
      }
    }

    return results;
  }

  async loadIndexPatterns() {
    return await this.savedObjectsClient.find({ type: 'index-pattern', perPage: 1000 });
  }

  // returns a id based on an index pattern name
  getIndexPatternId(name) {
    if (this.indexPatterns && this.indexPatterns.saved_objects) {
      const ip = this.indexPatterns.saved_objects.find(i => i.attributes.title === name);
      return ip !== undefined ? ip.id : undefined;
    } else {
      return undefined;
    }
  }

  // create a list of objects which are used to save the savedObjects.
  // each has an exists flag and those which do not already exist
  // contain a savedObject object which is sent to the server to save
  async createSavedObjectsToSave(moduleConfig) {
    // first check if the saved objects already exist.
    const savedObjectExistResults = await this.checkIfSavedObjectsExist(
      moduleConfig.kibana,
      this.request
    );
    // loop through the kibanaSaveResults and update
    Object.keys(moduleConfig.kibana).forEach(type => {
      // type e.g. dashboard, search ,visualization
      moduleConfig.kibana[type].forEach(configItem => {
        const existsResult = savedObjectExistResults.find(o => o.id === configItem.id);
        if (existsResult !== undefined) {
          configItem.exists = existsResult.exists;
          if (existsResult.exists === false) {
            // if this object doesn't already exist, create the savedObject
            // which will be used to create it
            existsResult.savedObject = {
              type,
              id: configItem.id,
              attributes: configItem.config,
            };
          }
        }
      });
    });
    return savedObjectExistResults;
  }

  // update the exists flags in the kibana results
  updateKibanaResults(kibanaSaveResults, objectExistResults) {
    Object.keys(kibanaSaveResults).forEach(type => {
      kibanaSaveResults[type].forEach(resultItem => {
        const i = objectExistResults.find(o => o.id === resultItem.id && o.type === type);
        resultItem.exists = i !== undefined;
      });
    });
  }

  // loop through each type (dashboard, search, visualization)
  // load existing savedObjects for each type and compare to find out if
  // items with the same id already exist.
  // returns a flat list of objects with exists flags set
  async checkIfSavedObjectsExist(kibanaObjects) {
    const types = Object.keys(kibanaObjects);
    const results = await Promise.all(
      types.map(async type => {
        const existingObjects = await this.loadExistingSavedObjects(type);
        return kibanaObjects[type].map(obj => {
          const existingObject = existingObjects.saved_objects.find(
            o => o.attributes && o.attributes.title === obj.title
          );
          return {
            id: obj.id,
            type,
            exists: existingObject !== undefined,
          };
        });
      })
    );
    // merge all results
    return [].concat(...results);
  }

  // find all existing savedObjects for a given type
  loadExistingSavedObjects(type) {
    return this.savedObjectsClient.find({ type, perPage: 1000 });
  }

  // save the savedObjects if they do not exist already
  async saveKibanaObjects(objectExistResults) {
    let results = { saved_objects: [] };
    const filteredSavedObjects = objectExistResults
      .filter(o => o.exists === false)
      .map(o => o.savedObject);
    if (filteredSavedObjects.length) {
      results = await this.savedObjectsClient.bulkCreate(
        // Add an empty migrationVersion attribute to each saved object to ensure
        // it is automatically migrated to the 7.0+ format with a references attribute.
        filteredSavedObjects.map(doc => ({ ...doc, migrationVersion: doc.migrationVersion || {} }))
      );
    }
    return results.saved_objects;
  }

  // save the jobs.
  // if any fail (e.g. it already exists), catch the error and mark the result
  // as success: false
  async saveJobs(jobs) {
    return await Promise.all(
      jobs.map(async job => {
        const jobId = job.id;
        try {
          job.id = jobId;
          await this.saveJob(job);
          return { id: jobId, success: true };
        } catch (error) {
          return { id: jobId, success: false, error };
        }
      })
    );
  }

  async saveJob(job) {
    const { id: jobId, config: body } = job;
    return this.callWithRequest('ml.addJob', { jobId, body });
  }

  // save the datafeeds.
  // if any fail (e.g. it already exists), catch the error and mark the result
  // as success: false
  async saveDatafeeds(datafeeds) {
    return await Promise.all(
      datafeeds.map(async datafeed => {
        try {
          await this.saveDatafeed(datafeed);
          return { id: datafeed.id, success: true, started: false };
        } catch (error) {
          return { id: datafeed.id, success: false, started: false, error };
        }
      })
    );
  }

  async saveDatafeed(datafeed) {
    const { id: datafeedId, config: body } = datafeed;
    return this.callWithRequest('ml.addDatafeed', { datafeedId, body });
  }

  async startDatafeeds(datafeeds, start, end) {
    const results = {};
    for (const datafeed of datafeeds) {
      results[datafeed.id] = await this.startDatafeed(datafeed, start, end);
    }
    return results;
  }

  async startDatafeed(datafeed, start, end) {
    const result = { started: false };
    let opened = false;
    try {
      const openResult = await this.callWithRequest('ml.openJob', {
        jobId: datafeed.config.job_id,
      });
      opened = openResult.opened;
    } catch (error) {
      // if the job is already open, a 409 will be returned.
      if (error.statusCode === 409) {
        opened = true;
      } else {
        opened = false;
        result.started = false;
        result.error = error;
      }
    }
    if (opened) {
      try {
        const duration = { start: 0 };
        if (start !== undefined) {
          duration.start = start;
        }
        if (end !== undefined) {
          duration.end = end;
        }

        await this.callWithRequest('ml.startDatafeed', { datafeedId: datafeed.id, ...duration });
        result.started = true;
      } catch (error) {
        result.started = false;
        result.error = error;
      }
    }
    return result;
  }

  // merge all of the save results into one result object
  // which is returned from the endpoint
  async updateResults(results, saveResults) {
    // update job results
    results.jobs.forEach(j => {
      saveResults.jobs.forEach(j2 => {
        if (j.id === j2.id) {
          j.success = j2.success;
          if (j2.error !== undefined) {
            j.error = j2.error;
          }
        }
      });
    });

    // update datafeed results
    results.datafeeds.forEach(d => {
      saveResults.datafeeds.forEach(d2 => {
        if (d.id === d2.id) {
          d.success = d2.success;
          d.started = d2.started;
          if (d2.error !== undefined) {
            d.error = d2.error;
          }
        }
      });
    });

    // update savedObjects results
    Object.keys(results.kibana).forEach(category => {
      results.kibana[category].forEach(item => {
        const result = saveResults.savedObjects.find(o => o.id === item.id);
        if (result !== undefined) {
          item.exists = result.exists;

          if (result.error === undefined) {
            item.success = true;
          } else {
            item.success = false;
            item.error = result.error;
          }
        }
      });
    });
  }

  // creates an empty results object,
  // listing each job/datafeed/savedObject with a save success boolean
  createResultsTemplate(moduleConfig) {
    const results = {};
    const reducedConfig = {
      jobs: moduleConfig.jobs,
      datafeeds: moduleConfig.datafeeds,
      kibana: moduleConfig.kibana,
    };

    function createResultsItems(configItems, resultItems, index) {
      resultItems[index] = [];
      configItems.forEach(j => {
        resultItems[index].push({
          id: j.id,
          success: false,
        });
      });
    }

    Object.keys(reducedConfig).forEach(i => {
      if (Array.isArray(reducedConfig[i])) {
        createResultsItems(reducedConfig[i], results, i);
      } else {
        results[i] = {};
        Object.keys(reducedConfig[i]).forEach(k => {
          createResultsItems(reducedConfig[i][k], results[i], k);
        });
      }
    });
    return results;
  }

  // if an override index pattern has been specified,
  // update all of the datafeeds.
  updateDatafeedIndices(moduleConfig) {
    // if the supplied index pattern contains a comma, split into multiple indices and
    // add each one to the datafeed
    const indexPatternNames = this.indexPatternName.includes(',')
      ? this.indexPatternName.split(',').map(i => i.trim())
      : [this.indexPatternName];

    moduleConfig.datafeeds.forEach(df => {
      const newIndices = [];
      // the datafeed can contain indexes and indices
      const currentIndices =
        df.config.indexes !== undefined ? df.config.indexes : df.config.indices;

      currentIndices.forEach(index => {
        if (index === INDEX_PATTERN_NAME) {
          // the datafeed index is INDEX_PATTERN_NAME, so replace it with index pattern(s)
          // supplied by the user or the default one from the manifest
          newIndices.push(...indexPatternNames);
        } else {
          // otherwise keep using the index from the datafeed json
          newIndices.push(index);
        }
      });

      // just in case indexes was used, delete it in favour of indices
      delete df.config.indexes;
      df.config.indices = newIndices;
    });
    moduleConfig.datafeeds;
  }

  // loop through the custom urls in each job and replace the INDEX_PATTERN_ID
  // marker for the id of the specified index pattern
  updateJobUrlIndexPatterns(moduleConfig) {
    if (Array.isArray(moduleConfig.jobs)) {
      moduleConfig.jobs.forEach(job => {
        // if the job has custom_urls
        if (job.config.custom_settings && job.config.custom_settings.custom_urls) {
          // loop through each url, replacing the INDEX_PATTERN_ID marker
          job.config.custom_settings.custom_urls.forEach(cUrl => {
            const url = cUrl.url_value;
            if (url.match(INDEX_PATTERN_ID)) {
              const newUrl = url.replace(new RegExp(INDEX_PATTERN_ID, 'g'), this.indexPatternId);
              // update the job's url
              cUrl.url_value = newUrl;
            }
          });
        }
      });
    }
  }

  // check the custom urls in the module's jobs to see if they contain INDEX_PATTERN_ID
  // which needs replacement
  doJobUrlsContainIndexPatternId(moduleConfig) {
    if (Array.isArray(moduleConfig.jobs)) {
      for (const job of moduleConfig.jobs) {
        // if the job has custom_urls
        if (job.config.custom_settings && job.config.custom_settings.custom_urls) {
          for (const cUrl of job.config.custom_settings.custom_urls) {
            if (cUrl.url_value.match(INDEX_PATTERN_ID)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // loop through each kibana saved object and replace any INDEX_PATTERN_ID and
  // INDEX_PATTERN_NAME markers for the id or name of the specified index pattern
  updateSavedObjectIndexPatterns(moduleConfig) {
    if (moduleConfig.kibana) {
      Object.keys(moduleConfig.kibana).forEach(category => {
        moduleConfig.kibana[category].forEach(item => {
          let jsonString = item.config.kibanaSavedObjectMeta.searchSourceJSON;
          if (jsonString.match(INDEX_PATTERN_ID)) {
            jsonString = jsonString.replace(new RegExp(INDEX_PATTERN_ID, 'g'), this.indexPatternId);
            item.config.kibanaSavedObjectMeta.searchSourceJSON = jsonString;
          }

          if (category === SAVED_OBJECT_TYPES.VISUALIZATION) {
            // Look for any INDEX_PATTERN_NAME tokens in visualization visState,
            // as e.g. Vega visualizations reference the Elasticsearch index pattern directly.
            let visStateString = item.config.visState;
            if (visStateString !== undefined && visStateString.match(INDEX_PATTERN_NAME)) {
              visStateString = visStateString.replace(
                new RegExp(INDEX_PATTERN_NAME, 'g'),
                this.indexPatternName
              );
              item.config.visState = visStateString;
            }
          }
        });
      });
    }
  }

  // ensure the model memory limit for each job is not greater than
  // the max model memory setting for the cluster
  async updateModelMemoryLimits(moduleConfig) {
    const { limits } = await this.callWithRequest('ml.info');
    const maxMml = limits.max_model_memory_limit;
    if (maxMml !== undefined) {
      const maxBytes = numeral(maxMml.toUpperCase()).value();

      if (Array.isArray(moduleConfig.jobs)) {
        moduleConfig.jobs.forEach(job => {
          const mml = get(job, 'config.analysis_limits.model_memory_limit');
          if (mml !== undefined) {
            const mmlBytes = numeral(mml.toUpperCase()).value();
            if (mmlBytes > maxBytes) {
              // if the job's mml is over the max,
              // so set the jobs mml to be the max
              job.config.analysis_limits.model_memory_limit = maxMml;
            }
          }
        });
      }
    }
  }

  // check the kibana saved searches JSON in the module to see if they contain INDEX_PATTERN_ID
  // which needs replacement
  doSavedObjectsContainIndexPatternId(moduleConfig) {
    if (moduleConfig.kibana) {
      for (const category of Object.keys(moduleConfig.kibana)) {
        for (const item of moduleConfig.kibana[category]) {
          const jsonString = item.config.kibanaSavedObjectMeta.searchSourceJSON;
          if (jsonString.match(INDEX_PATTERN_ID)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  applyJobConfigOverrides(moduleConfig, jobOverrides, jobPrefix = '') {
    if (jobOverrides !== undefined && jobOverrides !== null) {
      if (typeof jobOverrides !== 'object') {
        throw Boom.badRequest(
          `Incompatible jobOverrides type (${typeof jobOverrides}). It needs to be an object or array of objects.`
        );
      }

      // jobOverrides could be a single object or an array of objects.
      // if single, convert to an array
      const overrides = Array.isArray(jobOverrides) ? jobOverrides : [jobOverrides];
      const { jobs } = moduleConfig;

      // separate all the overrides.
      // the overrides which don't contain a job id will be applied to all jobs in the module
      const generalOverrides = [];
      const jobSpecificOverrides = [];
      overrides.forEach(o => {
        if (o.job_id === undefined) {
          generalOverrides.push(o);
        } else {
          jobSpecificOverrides.push(o);
        }
      });

      generalOverrides.forEach(o => {
        jobs.forEach(({ config }) => merge(config, o));
      });

      jobSpecificOverrides.forEach(o => {
        // for each override, find the relevant job.
        // note, the job id already has the prefix prepended to it
        const job = jobs.find(j => j.id === `${jobPrefix}${o.job_id}`);
        if (job !== undefined) {
          // delete the job_id in the override as this shouldn't be overridden
          delete o.job_id;
          merge(job.config, o);
        }
      });
    }
  }

  applyDatafeedConfigOverrides(moduleConfig, datafeedOverrides, jobPrefix = '') {
    if (datafeedOverrides !== undefined && datafeedOverrides !== null) {
      if (typeof datafeedOverrides !== 'object') {
        throw Boom.badRequest(
          `Incompatible datafeedOverrides type (${typeof datafeedOverrides}). It needs to be an object or array of objects.`
        );
      }

      // jobOverrides could be a single object or an array of objects.
      // if single, convert to an array
      const overrides = Array.isArray(datafeedOverrides) ? datafeedOverrides : [datafeedOverrides];
      const { datafeeds } = moduleConfig;

      // separate all the overrides.
      // the overrides which don't contain a datafeed id or a job id will be applied to all jobs in the module
      const generalOverrides = [];
      const datafeedSpecificOverrides = [];
      overrides.forEach(o => {
        if (o.datafeed_id === undefined && o.job_id === undefined) {
          generalOverrides.push(o);
        } else {
          datafeedSpecificOverrides.push(o);
        }
      });

      generalOverrides.forEach(o => {
        datafeeds.forEach(({ config }) => {
          merge(config, o);
        });
      });

      // collect all the overrides which contain either a job id or a datafeed id
      datafeedSpecificOverrides.forEach(o => {
        // either a job id or datafeed id has been specified, so create a new id
        // containing either one plus the prefix
        const tempId = o.datafeed_id !== undefined ? o.datafeed_id : o.job_id;
        const dId = prefixDatafeedId(tempId, jobPrefix);

        const datafeed = datafeeds.find(d => d.id === dId);
        if (datafeed !== undefined) {
          delete o.job_id;
          delete o.datafeed_id;
          merge(datafeed.config, o);
        }
      });
    }
  }
}
