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

import { JOB_TYPE } from './util/constants';

export const jobCreatorFactory = (jobType: JOB_TYPE) => (
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
  return new jc(indexPattern, savedSearch, query);
};
