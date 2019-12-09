/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'ui/index_patterns';
import { mlFunctionToESAggregation } from '../../../common/util/job_utils';
import { getIndexPatternById, getIndexPatternIdFromName } from '../util/index_utils';
import { mlJobService } from './job_service';

type FormatsByJobId = Record<string, any>;
type IndexPatternIdsByJob = Record<string, any>;

// Service for accessing FieldFormat objects configured for a Kibana index pattern
// for use in formatting the actual and typical values from anomalies.
class FieldFormatService {
  indexPatternIdsByJob: IndexPatternIdsByJob = {};
  formatsByJob: FormatsByJobId = {};

  // Populate the service with the FieldFormats for the list of jobs with the
  // specified IDs. List of Kibana index patterns is passed, with a title
  // attribute set in each pattern which will be compared to the index pattern
  // configured in the datafeed of each job.
  // Builds a map of Kibana FieldFormats (plugins/data/common/field_formats)
  // against detector index by job ID.
  populateFormats(jobIds: string[]): Promise<FormatsByJobId> {
    return new Promise((resolve, reject) => {
      // Populate a map of index pattern IDs against job ID, by finding the ID of the index
      // pattern with a title attribute which matches the index configured in the datafeed.
      // If a Kibana index pattern has not been created
      // for this index, then no custom field formatting will occur.
      jobIds.forEach(jobId => {
        const jobObj = mlJobService.getJob(jobId);
        const datafeedIndices = jobObj.datafeed_config.indices;
        const id = getIndexPatternIdFromName(datafeedIndices.length ? datafeedIndices[0] : '');
        if (id !== null) {
          this.indexPatternIdsByJob[jobId] = id;
        }
      });

      const promises = jobIds.map(jobId => Promise.all([this.getFormatsForJob(jobId)]));

      Promise.all(promises)
        .then(fmtsByJobByDetector => {
          fmtsByJobByDetector.forEach((formatsByDetector, i) => {
            this.formatsByJob[jobIds[i]] = formatsByDetector[0];
          });

          resolve(this.formatsByJob);
        })
        .catch(err => {
          reject({ formats: {}, err });
        });
    });
  }

  // Return the FieldFormat to use for formatting values from
  // the detector from the job with the specified ID.
  getFieldFormat(jobId: string, detectorIndex: number) {
    if (this.formatsByJob.hasOwnProperty(jobId)) {
      return this.formatsByJob[jobId][detectorIndex];
    }
  }

  // Utility for returning the FieldFormat from a full populated Kibana index pattern object
  // containing the list of fields by name with their formats.
  getFieldFormatFromIndexPattern(
    fullIndexPattern: IndexPattern,
    fieldName: string,
    esAggName: string
  ) {
    // Don't use the field formatter for distinct count detectors as
    // e.g. distinct_count(clientip) should be formatted as a count, not as an IP address.
    let fieldFormat;
    if (esAggName !== 'cardinality') {
      const fieldList = fullIndexPattern.fields;
      const field = fieldList.getByName(fieldName);
      if (field !== undefined) {
        fieldFormat = field.format;
      }
    }

    return fieldFormat;
  }

  getFormatsForJob(jobId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const jobObj = mlJobService.getJob(jobId);
      const detectors = jobObj.analysis_config.detectors || [];
      const formatsByDetector: any[] = [];

      const indexPatternId = this.indexPatternIdsByJob[jobId];
      if (indexPatternId !== undefined) {
        // Load the full index pattern configuration to obtain the formats of each field.
        getIndexPatternById(indexPatternId)
          .then(indexPatternData => {
            // Store the FieldFormat for each job by detector_index.
            const fieldList = indexPatternData.fields;
            detectors.forEach(dtr => {
              const esAgg = mlFunctionToESAggregation(dtr.function);
              // distinct_count detectors should fall back to the default
              // formatter as the values are just counts.
              if (dtr.field_name !== undefined && esAgg !== 'cardinality') {
                const field = fieldList.getByName(dtr.field_name);
                if (field !== undefined) {
                  formatsByDetector[dtr.detector_index!] = field.format;
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
