/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import {
  EVENT_RATE_FIELD_ID,
  ML_JOB_AGGREGATION,
  type Aggregation,
  type Field,
} from '@kbn/ml-anomaly-utils';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { EsqlJobCreator } from './esql_job_creator';

const field = (id: string): Field => ({
  id,
  name: id,
  type: ES_FIELD_TYPES.DOUBLE,
  aggregatable: true,
  counter: false,
});

const agg = (id: ML_JOB_AGGREGATION): Aggregation =>
  ({ id, title: id, kibanaName: null, dslName: null, type: 'metrics' } as Aggregation);

const createJobCreator = () => new EsqlJobCreator({} as MlApi, {} as NewJobCapsService);

describe('EsqlJobCreator', () => {
  it('turns off the delayed data check when there is no count detector', () => {
    const jobCreator = createJobCreator();
    jobCreator.addDetector(agg(ML_JOB_AGGREGATION.MEAN), field('responsetime'));

    expect(jobCreator.datafeedConfig.delayed_data_check_config).toEqual({ enabled: false });
  });

  it('leaves the delayed data check on while there is a count detector', () => {
    const jobCreator = createJobCreator();
    jobCreator.addDetector(agg(ML_JOB_AGGREGATION.MEAN), field('responsetime'));
    jobCreator.addDetector(agg(ML_JOB_AGGREGATION.HIGH_COUNT), field(EVENT_RATE_FIELD_ID));

    expect(jobCreator.datafeedConfig.delayed_data_check_config).toBeUndefined();

    jobCreator.removeDetector(1);
    expect(jobCreator.datafeedConfig.delayed_data_check_config).toEqual({ enabled: false });

    jobCreator.editDetector(agg(ML_JOB_AGGREGATION.COUNT), field(EVENT_RATE_FIELD_ID), 0);
    expect(jobCreator.datafeedConfig.delayed_data_check_config).toBeUndefined();
  });

  it('has no DSL query or indices in its datafeed', () => {
    const { datafeedConfig } = createJobCreator();

    expect(datafeedConfig.query).toBeUndefined();
    expect(datafeedConfig.indices).toBeUndefined();
  });
});
