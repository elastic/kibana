/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraKibanaConfigurationAdapter } from './kibana_configuration_adapter';

describe('the InfraKibanaConfigurationAdapter', () => {
  test('queries the xpack.infra configuration of the server', async () => {
    const mockConfig = {
      get: jest.fn(),
    };

    const configurationAdapter = new InfraKibanaConfigurationAdapter({
      config: () => mockConfig,
    });

    await configurationAdapter.get();

    expect(mockConfig.get).toBeCalledWith('xpack.infra');
  });

  test('applies the query defaults', async () => {
    const configurationAdapter = new InfraKibanaConfigurationAdapter({
      config: () => ({
        get: () => ({}),
      }),
    });

    const configuration = await configurationAdapter.get();

    expect(configuration).toMatchObject({
      query: {
        partitionSize: expect.any(Number),
        partitionFactor: expect.any(Number),
      },
    });
  });
});
