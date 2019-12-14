/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { mlFunctionToESAggregation } from '../../common/util/job_utils';
import { getIndexPatternById } from '../util/index_utils';
import { mlJobService } from '../services/job_service';

// Service for accessing FieldFormat objects configured for a Kibana index pattern
// for use in formatting the actual and typical values from anomalies.
class FieldFormatService {
  constructor() {
    this.indexPatternIdsByJob = {};
    this.formatsByJob = {};
  }

  // Populate the service with the FieldFormats for the list of jobs with the
  // specified IDs. List of Kibana index patterns is passed, with a title
  // attribute set in each pattern which will be compared to the index pattern
  // configured in the datafeed of each job.
  // Builds a map of Kibana FieldFormats (plugins/data/common/field_formats)
  // against detector index by job ID.
  populateFormats(jobIds, indexPatterns) {
    return new Promise((resolve, reject) => {
      // Populate a map of index pattern IDs against job ID, by finding the ID of the index
      // pattern with a title attribute which matches the index configured in the datafeed.
      // If a Kibana index pattern has not been created
      // for this index, then no custom field formatting will occur.
      _.each(jobIds, jobId => {
        const jobObj = mlJobService.getJob(jobId);
        const datafeedIndices = jobObj.datafeed_config.indices;
        const indexPattern = _.find(indexPatterns, index => {
          return _.find(datafeedIndices, datafeedIndex => {
            return index.get('title') === datafeedIndex;
          });
        });

        // Check if index pattern has been configured to match the index in datafeed.
        if (indexPattern !== undefined) {
          this.indexPatternIdsByJob[jobId] = indexPattern.id;
        }
      });

      const promises = jobIds.map(jobId => Promise.all([this.getFormatsForJob(jobId)]));

      Promise.all(promises)
        .then(fmtsByJobByDetector => {
          _.each(fmtsByJobByDetector, (formatsByDetector, index) => {
            this.formatsByJob[jobIds[index]] = formatsByDetector[0];
          });

          resolve(this.formatsByJob);
        })
        .catch(err => {
          console.log('fieldFormatService error populating formats:', err);
          reject({ formats: {}, err });
        });
    });
  }

  // Return the FieldFormat to use for formatting values from
  // the detector from the job with the specified ID.
  getFieldFormat(jobId, detectorIndex) {
    return _.get(this.formatsByJob, [jobId, detectorIndex]);
  }

  // Utility for returning the FieldFormat from a full populated Kibana index pattern object
  // containing the list of fields by name with their formats.
  getFieldFormatFromIndexPattern(fullIndexPattern, fieldName, esAggName) {
    // Don't use the field formatter for distinct count detectors as
    // e.g. distinct_count(clientip) should be formatted as a count, not as an IP address.
    let fieldFormat = undefined;
    if (esAggName !== 'cardinality') {
      const fieldList = _.get(fullIndexPattern, 'fields', []);
      const field = fieldList.getByName(fieldName);
      if (field !== undefined) {
        fieldFormat = field.format;
      }
    }

    return fieldFormat;
  }

  getFormatsForJob(jobId) {
    return new Promise((resolve, reject) => {
      const jobObj = mlJobService.getJob(jobId);
      const detectors = jobObj.analysis_config.detectors || [];
      const formatsByDetector = {};

      const indexPatternId = this.indexPatternIdsByJob[jobId];
      if (indexPatternId !== undefined) {
        // Load the full index pattern configuration to obtain the formats of each field.
        getIndexPatternById(indexPatternId)
          .then(indexPatternData => {
            // Store the FieldFormat for each job by detector_index.
            const fieldList = _.get(indexPatternData, 'fields', []);
            _.each(detectors, dtr => {
              const esAgg = mlFunctionToESAggregation(dtr.function);
              // distinct_count detectors should fall back to the default
              // formatter as the values are just counts.
              if (dtr.field_name !== undefined && esAgg !== 'cardinality') {
                const field = fieldList.getByName(dtr.field_name);
                if (field !== undefined) {
                  formatsByDetector[dtr.detector_index] = field.format;
                }
              }
            });

            resolve(formatsByDetector);
          })
          .catch(err => {
            reject(err);
          });
      } else {
        resolve(formatsByDetector);
      }
    });
  }
}

export const mlFieldFormatService = new FieldFormatService();
