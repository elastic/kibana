/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedSearchSavedObject } from '../../../../../../common/types/kibana';
import { SingleMetricJobCreator } from './single_metric_job_creator';
import { MultiMetricJobCreator } from './multi_metric_job_creator';
import { PopulationJobCreator } from './population_job_creator';
import { AdvancedJobCreator } from './advanced_job_creator';
import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';
import { CategorizationJobCreator } from './categorization_job_creator';

import { JOB_TYPE } from '../../../../../../common/constants/new_job';

export const jobCreatorFactory = (jobType: JOB_TYPE) => (
  indexPattern: IndexPattern,
  savedSearch: SavedSearchSavedObject | null,
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
    case JOB_TYPE.ADVANCED:
      jc = AdvancedJobCreator;
      break;
    case JOB_TYPE.CATEGORIZATION:
      jc = CategorizationJobCreator;
      break;
    default:
      jc = SingleMetricJobCreator;
      break;
  }
  return new jc(indexPattern, savedSearch, query);
};
