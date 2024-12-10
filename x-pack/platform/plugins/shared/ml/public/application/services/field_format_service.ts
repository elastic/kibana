/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mlFunctionToESAggregation } from '../../../common/util/job_utils';
import type { MlJobService } from './job_service';
import type { MlIndexUtils } from '../util/index_service';
import type { MlApi } from './ml_api_service';

type FormatsByJobId = Record<string, any>;
type IndexPatternIdsByJob = Record<string, any>;

// Service for accessing FieldFormat objects configured for a Kibana data view
// for use in formatting the actual and typical values from anomalies.
export class FieldFormatService {
  indexPatternIdsByJob: IndexPatternIdsByJob = {};
  formatsByJob: FormatsByJobId = {};

  constructor(
    private mlApi: MlApi,
    private mlIndexUtils: MlIndexUtils,
    private mlJobService: MlJobService
  ) {}

  // Populate the service with the FieldFormats for the list of jobs with the
  // specified IDs. List of Kibana data views is passed, with a title
  // attribute set in each pattern which will be compared to the indices
  // configured in the datafeed of each job.
  // Builds a map of Kibana FieldFormats (plugins/data/common/field_formats)
  // against detector index by job ID.
  async populateFormats(jobIds: string[]): Promise<FormatsByJobId> {
    // Populate a map of data view IDs against job ID, by finding the ID of the data
    // view with a title attribute which matches the indices configured in the datafeed.
    // If a Kibana data view has not been created
    // for this index, then no custom field formatting will occur.
    (
      await Promise.all(
        jobIds.map(async (jobId) => {
          let jobObj;
          if (this.mlApi) {
            const { jobs } = await this.mlApi.getJobs({ jobId });
            jobObj = jobs[0];
          } else {
            jobObj = this.mlJobService.getJob(jobId);
          }
          return {
            jobId,
            dataViewId: await this.mlIndexUtils.getDataViewIdFromName(
              jobObj.datafeed_config!.indices.join(',')
            ),
          };
        })
      )
    ).forEach(({ jobId, dataViewId }) => {
      if (dataViewId !== null) {
        this.indexPatternIdsByJob[jobId] = dataViewId;
      }
    });

    const promises = jobIds.map((jobId) => Promise.all([this.getFormatsForJob(jobId)]));

    try {
      const fmtsByJobByDetector = await Promise.all(promises);
      fmtsByJobByDetector.forEach((formatsByDetector, i) => {
        this.formatsByJob[jobIds[i]] = formatsByDetector[0];
      });

      return this.formatsByJob;
    } catch (error) {
      console.log('Error populating field formats:', error); // eslint-disable-line no-console
      return { formats: {}, error };
    }
  }

  // Return the FieldFormat to use for formatting values from
  // the detector from the job with the specified ID.
  getFieldFormat(jobId: string, detectorIndex: number) {
    if (Object.hasOwn(this.formatsByJob, jobId)) {
      return this.formatsByJob[jobId][detectorIndex];
    }
  }

  async getFormatsForJob(jobId: string): Promise<any[]> {
    let jobObj;
    if (this.mlApi) {
      const { jobs } = await this.mlApi.getJobs({ jobId });
      jobObj = jobs[0];
    } else {
      jobObj = this.mlJobService.getJob(jobId);
    }
    const detectors = jobObj.analysis_config.detectors || [];
    const formatsByDetector: any[] = [];

    const dataViewId = this.indexPatternIdsByJob[jobId];
    if (dataViewId !== undefined) {
      // Load the full data view configuration to obtain the formats of each field.
      const dataView = await this.mlIndexUtils.getDataViewById(dataViewId);
      // Store the FieldFormat for each job by detector_index.
      const fieldList = dataView.fields;
      detectors.forEach((dtr) => {
        const esAgg = mlFunctionToESAggregation(dtr.function);
        // distinct_count detectors should fall back to the default
        // formatter as the values are just counts.
        if (dtr.field_name !== undefined && esAgg !== 'cardinality') {
          const field = fieldList.getByName(dtr.field_name);
          if (field !== undefined) {
            formatsByDetector[dtr.detector_index!] = dataView.getFormatterForField(field);
          }
        }
      });
    }

    return formatsByDetector;
  }
}

export type MlFieldFormatService = FieldFormatService;
