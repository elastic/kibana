/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SingleMetricJobCreator } from './single_metric_job_creator';
import type { MultiMetricJobCreator } from './multi_metric_job_creator';
import type { PopulationJobCreator } from './population_job_creator';
import type { AdvancedJobCreator } from './advanced_job_creator';
import type { CategorizationJobCreator } from './categorization_job_creator';
import type { RareJobCreator } from './rare_job_creator';
import type { GeoJobCreator } from './geo_job_creator';
import type { EsqlJobCreator } from './esql_job_creator';
import { JOB_TYPE } from '../../../../../../common/constants/new_job';

export type JobCreatorType =
  | SingleMetricJobCreator
  | MultiMetricJobCreator
  | PopulationJobCreator
  | AdvancedJobCreator
  | CategorizationJobCreator
  | RareJobCreator
  | GeoJobCreator
  | EsqlJobCreator;

export type ClassicJobCreatorType = Exclude<JobCreatorType, EsqlJobCreator>;

export function isSingleMetricJobCreator(
  jobCreator: JobCreatorType
): jobCreator is SingleMetricJobCreator {
  return jobCreator.type === JOB_TYPE.SINGLE_METRIC;
}

export function isMultiMetricJobCreator(
  jobCreator: JobCreatorType
): jobCreator is MultiMetricJobCreator {
  return jobCreator.type === JOB_TYPE.MULTI_METRIC;
}

export function isPopulationJobCreator(
  jobCreator: JobCreatorType
): jobCreator is PopulationJobCreator {
  return jobCreator.type === JOB_TYPE.POPULATION;
}

export function isAdvancedJobCreator(jobCreator: JobCreatorType): jobCreator is AdvancedJobCreator {
  return jobCreator.type === JOB_TYPE.ADVANCED;
}

export function isCategorizationJobCreator(
  jobCreator: JobCreatorType
): jobCreator is CategorizationJobCreator {
  return jobCreator.type === JOB_TYPE.CATEGORIZATION;
}

export function isRareJobCreator(jobCreator: JobCreatorType): jobCreator is RareJobCreator {
  return jobCreator.type === JOB_TYPE.RARE;
}

export function isGeoJobCreator(jobCreator: JobCreatorType): jobCreator is GeoJobCreator {
  return jobCreator.type === JOB_TYPE.GEO;
}

export function isClassicJobCreator(
  jobCreator: JobCreatorType
): jobCreator is ClassicJobCreatorType {
  return jobCreator.type !== JOB_TYPE.ESQL;
}

export function isEsqlJobCreator(jobCreator: JobCreatorType): jobCreator is EsqlJobCreator {
  return jobCreator.type === JOB_TYPE.ESQL;
}
