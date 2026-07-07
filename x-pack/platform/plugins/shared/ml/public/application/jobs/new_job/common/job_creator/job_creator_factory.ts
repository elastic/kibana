/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { SingleMetricJobCreator } from './single_metric_job_creator';
import { MultiMetricJobCreator } from './multi_metric_job_creator';
import { PopulationJobCreator } from './population_job_creator';
import { AdvancedJobCreator } from './advanced_job_creator';
import { CategorizationJobCreator } from './categorization_job_creator';
import { RareJobCreator } from './rare_job_creator';
import { GeoJobCreator } from './geo_job_creator';

import { JOB_TYPE } from '../../../../../../common/constants/new_job';

export const jobCreatorFactory =
  (jobType: JOB_TYPE) =>
  (
    mlApi: MlApi,
    newJobCapsService: NewJobCapsService,
    indexPattern: DataView,
    savedSearch: SavedSearch | null,
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
      case JOB_TYPE.RARE:
        jc = RareJobCreator;
        break;
      case JOB_TYPE.GEO:
        jc = GeoJobCreator;
        break;
      default:
        jc = SingleMetricJobCreator;
        break;
    }
    return new jc(mlApi, newJobCapsService, indexPattern, savedSearch, query);
  };
