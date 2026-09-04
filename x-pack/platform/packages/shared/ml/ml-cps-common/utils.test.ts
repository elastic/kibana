/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import {
  getProjectRoutingFromDatafeed,
  getProjectRoutingFromJob,
  getProjectRoutingFromJobSummary,
} from './utils';

type DatafeedOverrides = Omit<Partial<Datafeed>, 'authorization'> & {
  authorization?: Datafeed['authorization'] & {
    cloud_api_key?: { id?: string };
  };
};

const createDatafeed = (overrides: DatafeedOverrides = {}): Datafeed => ({
  datafeed_id: 'datafeed-test-job',
  job_id: 'test-job',
  indices: ['test-index'],
  query: { match_all: {} },
  delayed_data_check_config: { enabled: true },
  ...overrides,
});

describe('getProjectRoutingFromDatafeed', () => {
  it('returns project_routing when it is set', () => {
    const datafeed = createDatafeed({ project_routing: '_id:blah' });

    expect(getProjectRoutingFromDatafeed(datafeed)).toBe('_id:blah');
  });

  it('returns origin routing when project_routing is unset and cloud API key is missing', () => {
    const datafeed = createDatafeed();

    expect(getProjectRoutingFromDatafeed(datafeed)).toBe('_alias:_origin');
  });

  it('returns origin routing when authorization has no cloud_api_key id', () => {
    const datafeed = createDatafeed({
      authorization: {},
    });

    expect(getProjectRoutingFromDatafeed(datafeed)).toBe('_alias:_origin');
  });

  it('returns all-projects routing when project_routing is unset and cloud API key is present', () => {
    const datafeed = createDatafeed({
      authorization: {
        cloud_api_key: { id: 'api-key-id' },
      },
    });

    expect(getProjectRoutingFromDatafeed(datafeed)).toBe('_alias:*');
  });
});

describe('getProjectRoutingFromJob', () => {
  it('returns null when the job has no datafeed_config', () => {
    const job = { job_id: 'test-job' } as estypes.MlJob;

    expect(getProjectRoutingFromJob(job)).toBeNull();
  });

  it('returns project_routing from the job datafeed_config', () => {
    const job = {
      job_id: 'test-job',
      datafeed_config: createDatafeed({ project_routing: '_id:blah' }),
    } as estypes.MlJob;

    expect(getProjectRoutingFromJob(job)).toBe('_id:blah');
  });

  it('returns origin routing when datafeed has no project_routing or cloud API key', () => {
    const job = {
      job_id: 'test-job',
      datafeed_config: createDatafeed(),
    } as estypes.MlJob;

    expect(getProjectRoutingFromJob(job)).toBe('_alias:_origin');
  });

  it('returns all-projects routing when datafeed has a cloud API key and no project_routing', () => {
    const job = {
      job_id: 'test-job',
      datafeed_config: createDatafeed({
        authorization: {
          cloud_api_key: { id: 'api-key-id' },
        },
      }),
    } as estypes.MlJob;

    expect(getProjectRoutingFromJob(job)).toBe('_alias:*');
  });
});

describe('getProjectRoutingFromJobSummary', () => {
  it('returns the stored project routing when it is set', () => {
    expect(
      getProjectRoutingFromJobSummary({ projectRouting: '_id:blah', isUiamEnabled: true })
    ).toBe('_id:blah');
  });

  it('returns all-projects routing for unscoped jobs with a cloud API key', () => {
    expect(getProjectRoutingFromJobSummary({ projectRouting: null, isUiamEnabled: true })).toBe(
      '_alias:*'
    );
  });

  it('returns origin routing for unscoped jobs without a cloud API key', () => {
    expect(getProjectRoutingFromJobSummary({ projectRouting: null, isUiamEnabled: false })).toBe(
      '_alias:_origin'
    );
  });

  it('returns null when both fields are absent (CPS disabled)', () => {
    expect(getProjectRoutingFromJobSummary({})).toBeNull();
  });
});
