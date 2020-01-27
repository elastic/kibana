/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

export class FilterManager {
  constructor(callWithRequest) {
    this.callWithRequest = callWithRequest;
  }

  async getFilter(filterId) {
    try {
      const [JOBS, FILTERS] = [0, 1];
      const results = await Promise.all([
        this.callWithRequest('ml.jobs'),
        this.callWithRequest('ml.filters', { filterId }),
      ]);

      if (results[FILTERS] && results[FILTERS].filters.length) {
        let filtersInUse = {};
        if (results[JOBS] && results[JOBS].jobs) {
          filtersInUse = this.buildFiltersInUse(results[JOBS].jobs);
        }

        const filter = results[FILTERS].filters[0];
        filter.used_by = filtersInUse[filter.filter_id];
        return filter;
      } else {
        throw Boom.notFound(`Filter with the id "${filterId}" not found`);
      }
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async getAllFilters() {
    try {
      const filtersResp = await this.callWithRequest('ml.filters');
      return filtersResp.filters;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async getAllFilterStats() {
    try {
      const [JOBS, FILTERS] = [0, 1];
      const results = await Promise.all([
        this.callWithRequest('ml.jobs'),
        this.callWithRequest('ml.filters'),
      ]);

      // Build a map of filter_ids against jobs and detectors using that filter.
      let filtersInUse = {};
      if (results[JOBS] && results[JOBS].jobs) {
        filtersInUse = this.buildFiltersInUse(results[JOBS].jobs);
      }

      // For each filter, return just
      //  filter_id
      //  description
      //  item_count
      //  jobs using the filter
      const filterStats = [];
      if (results[FILTERS] && results[FILTERS].filters) {
        results[FILTERS].filters.forEach(filter => {
          const stats = {
            filter_id: filter.filter_id,
            description: filter.description,
            item_count: filter.items.length,
            used_by: filtersInUse[filter.filter_id],
          };
          filterStats.push(stats);
        });
      }

      return filterStats;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async newFilter(filter) {
    const filterId = filter.filterId;
    delete filter.filterId;
    try {
      // Returns the newly created filter.
      return await this.callWithRequest('ml.addFilter', { filterId, body: filter });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async updateFilter(filterId, description, addItems, removeItems) {
    try {
      const body = {};
      if (description !== undefined) {
        body.description = description;
      }
      if (addItems !== undefined) {
        body.add_items = addItems;
      }
      if (removeItems !== undefined) {
        body.remove_items = removeItems;
      }

      // Returns the newly updated filter.
      return await this.callWithRequest('ml.updateFilter', {
        filterId,
        body,
      });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async deleteFilter(filterId) {
    return this.callWithRequest('ml.deleteFilter', { filterId });
  }

  buildFiltersInUse(jobsList) {
    // Build a map of filter_ids against jobs and detectors using that filter.
    const filtersInUse = {};
    jobsList.forEach(job => {
      const detectors = job.analysis_config.detectors;
      detectors.forEach(detector => {
        if (detector.custom_rules) {
          const rules = detector.custom_rules;
          rules.forEach(rule => {
            if (rule.scope) {
              const scopeFields = Object.keys(rule.scope);
              scopeFields.forEach(scopeField => {
                const filter = rule.scope[scopeField];
                const filterId = filter.filter_id;
                if (filtersInUse[filterId] === undefined) {
                  filtersInUse[filterId] = { jobs: [], detectors: [] };
                }

                const jobs = filtersInUse[filterId].jobs;
                const dtrs = filtersInUse[filterId].detectors;
                const jobId = job.job_id;

                // Label the detector with the job it comes from.
                const detectorLabel = `${detector.detector_description} (${jobId})`;
                if (jobs.indexOf(jobId) === -1) {
                  jobs.push(jobId);
                }

                if (dtrs.indexOf(detectorLabel) === -1) {
                  dtrs.push(detectorLabel);
                }
              });
            }
          });
        }
      });
    });

    return filtersInUse;
  }
}
