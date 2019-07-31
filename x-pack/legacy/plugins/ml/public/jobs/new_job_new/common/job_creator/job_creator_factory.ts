/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';
import { IndexPattern } from 'ui/index_patterns';
import { SingleMetricJobCreator } from './single_metric_job_creator';
import { MultiMetricJobCreator } from './multi_metric_job_creator';
import { PopulationJobCreator } from './population_job_creator';
import { Job, Datafeed } from './configs';
import {
  isSingleMetricJobCreator,
  isMultiMetricJobCreator,
  isPopulationJobCreator,
} from './type_guards';
import { newJobCapsService } from '../../../../services/new_job_capabilities_service';

import { JOB_TYPE } from './util/constants';

export interface CombinedJobConfig {
  job: Job;
  datafeed: Datafeed;
}

export const jobCreatorFactory = (jobType: JOB_TYPE, config?: CombinedJobConfig) => (
  indexPattern: IndexPattern,
  savedSearch: SavedSearch,
  query: object
) => {
  let jc;
  switch (jobType) {
    case JOB_TYPE.SINGLE_METRIC:
      jc = SingleMetricJobCreator;
      break;
    case JOB_TYPE.MULTI_METRIC:
      jc = MultiMetricJobCreator;
      break;
    case JOB_TYPE.POPULATION:
      jc = PopulationJobCreator;
      break;
    default:
      jc = SingleMetricJobCreator;
      break;
  }
  const jobCreator = new jc(indexPattern, savedSearch, query);
  if (config !== undefined) {
    prePopulateJob(jobCreator, config);
  }
  return jobCreator;
};

function prePopulateJob(
  jobCreator: SingleMetricJobCreator | MultiMetricJobCreator | PopulationJobCreator,
  config: CombinedJobConfig
) {
  jobCreator.overrideConfigs(config.job, config.datafeed);

  jobCreator.jobId = '';

  if (config.job.analysis_config.influencers !== undefined) {
    config.job.analysis_config.influencers.forEach(i => jobCreator.addInfluencer(i));
  }

  const detectors = config.job.analysis_config.detectors.map(d => {
    return {
      agg: newJobCapsService.getAggById(d.function),
      field: d.field_name !== undefined ? newJobCapsService.getFieldById(d.field_name) : null,
      byField:
        d.by_field_name !== undefined ? newJobCapsService.getFieldById(d.by_field_name) : null,
      overField:
        d.over_field_name !== undefined ? newJobCapsService.getFieldById(d.over_field_name) : null,
      partitionField:
        d.partition_field_name !== undefined
          ? newJobCapsService.getFieldById(d.partition_field_name)
          : null,
    };
  });

  jobCreator.removeAllDetectors();

  if (isSingleMetricJobCreator(jobCreator)) {
    const dtr = detectors[0];
    if (detectors.length && dtr.agg !== null && dtr.field !== null) {
      jobCreator.setDetector(dtr.agg, dtr.field);
    }
  }

  if (isMultiMetricJobCreator(jobCreator)) {
    detectors.forEach((d, i) => {
      const dtr = detectors[i];
      if (dtr.agg !== null && dtr.field !== null) {
        jobCreator.addDetector(dtr.agg, dtr.field);
      }
    });
    if (detectors.length) {
      if (detectors[0].partitionField !== null) {
        jobCreator.setSplitField(detectors[0].partitionField);
      }
    }
  }

  if (isPopulationJobCreator(jobCreator)) {
    if (detectors.length) {
      if (detectors[0].overField !== null) {
        jobCreator.setSplitField(detectors[0].overField);
      }
    }

    detectors.forEach((d, i) => {
      const dtr = detectors[i];
      if (dtr.agg !== null && dtr.field !== null) {
        jobCreator.addDetector(dtr.agg, dtr.field);

        if (dtr.byField !== null) {
          jobCreator.setByField(dtr.byField, i);
        }
      }
    });
  }
}
