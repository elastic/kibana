/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SingleMetricJobCreator } from './single_metric_job_creator';
import { MultiMetricJobCreator } from './multi_metric_job_creator';
import { PopulationJobCreator } from './population_job_creator';
import { JOB_TYPE } from './util/constants';

export function isSingleMetricJobCreator(
  jobCreator: SingleMetricJobCreator | MultiMetricJobCreator | PopulationJobCreator
): jobCreator is SingleMetricJobCreator {
  return jobCreator.type === JOB_TYPE.SINGLE_METRIC;
}

export function isMultiMetricJobCreator(
  jobCreator: SingleMetricJobCreator | MultiMetricJobCreator | PopulationJobCreator
): jobCreator is MultiMetricJobCreator {
  return jobCreator.type === JOB_TYPE.MULTI_METRIC;
}

export function isPopulationJobCreator(
  jobCreator: SingleMetricJobCreator | MultiMetricJobCreator | PopulationJobCreator
): jobCreator is PopulationJobCreator {
  return jobCreator.type === JOB_TYPE.POPULATION;
}
