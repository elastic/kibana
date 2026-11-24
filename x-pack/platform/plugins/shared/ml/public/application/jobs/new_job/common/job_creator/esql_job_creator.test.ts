/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { EsqlJobCreator } from './esql_job_creator';

const createJobCreator = () => new EsqlJobCreator({} as MlApi, {} as NewJobCapsService);

describe('EsqlJobCreator', () => {
  it('turns on the delayed data check when the query has a count column', () => {
    const jobCreator = createJobCreator();
    jobCreator.summaryCountFieldName = 'event_count';

    expect(jobCreator.jobConfig.analysis_config.summary_count_field_name).toBe('event_count');
    expect(jobCreator.datafeedConfig.delayed_data_check_config).toEqual({ enabled: true });
  });

  it('turns off the delayed data check without a count column', () => {
    const jobCreator = createJobCreator();
    expect(jobCreator.datafeedConfig.delayed_data_check_config).toEqual({ enabled: false });

    jobCreator.summaryCountFieldName = 'event_count';
    jobCreator.summaryCountFieldName = null;

    expect(jobCreator.jobConfig.analysis_config.summary_count_field_name).toBeUndefined();
    expect(jobCreator.datafeedConfig.delayed_data_check_config).toEqual({ enabled: false });
  });

  it('locks the bucket span to the query interval until the query has none', () => {
    const jobCreator = createJobCreator();
    expect(jobCreator.isBucketSpanFromQuery).toBe(false);

    jobCreator.setBucketSpanFromQuery('1h');
    expect(jobCreator.isBucketSpanFromQuery).toBe(true);
    expect(jobCreator.bucketSpan).toBe('1h');
    expect(jobCreator.datafeedConfig.grouping_interval).toBe('1h');

    jobCreator.setBucketSpanFromQuery(null);
    expect(jobCreator.isBucketSpanFromQuery).toBe(false);
    expect(jobCreator.bucketSpan).toBe('1h');
  });

  it('has no DSL query or indices in its datafeed', () => {
    const { datafeedConfig } = createJobCreator();

    expect(datafeedConfig.query).toBeUndefined();
    expect(datafeedConfig.indices).toBeUndefined();
  });
});
