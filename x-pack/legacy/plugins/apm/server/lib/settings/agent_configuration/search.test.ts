/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { searchConfigurations } from './search';
import { searchMocks } from './search.mocks';
import { Setup } from '../../helpers/setup_request';

describe('search configurations', () => {
  it('should return configuration by matching on service.name', async () => {
    const res = await searchConfigurations({
      serviceName: 'my_service',
      environment: 'production',
      setup: ({
        config: { get: () => '' },
        client: { search: async () => searchMocks },
        internalClient: { search: async () => searchMocks },
        indices: {
          apm_oss: {
            sourcemapIndices: 'myIndex',
            errorIndices: 'myIndex',
            onboardingIndices: 'myIndex',
            spanIndices: 'myIndex',
            transactionIndices: 'myIndex',
            metricsIndices: 'myIndex',
            apmAgentConfigurationIndex: 'myIndex'
          }
        }
      } as unknown) as Setup
    });

    expect(res!._source.service).toEqual({ name: 'my_service' });
    expect(res!._source.settings).toEqual({ transaction_sample_rate: 0.2 });
  });

  it('should return configuration by matching on "production" env', async () => {
    const res = await searchConfigurations({
      serviceName: 'non_existing_service',
      environment: 'production',
      setup: ({
        config: { get: () => '' },
        client: { search: async () => searchMocks },
        internalClient: { search: async () => searchMocks },
        indices: {
          apm_oss: {
            sourcemapIndices: 'myIndex',
            errorIndices: 'myIndex',
            onboardingIndices: 'myIndex',
            spanIndices: 'myIndex',
            transactionIndices: 'myIndex',
            metricsIndices: 'myIndex',
            apmAgentConfigurationIndex: 'myIndex'
          }
        }
      } as unknown) as Setup
    });

    expect(res!._source.service).toEqual({ environment: 'production' });
    expect(res!._source.settings).toEqual({ transaction_sample_rate: 0.3 });
  });
});
