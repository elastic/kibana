/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { createIndexPatternsStartMock } from '@kbn/data-views-plugin/server/mocks';
import { configSchema } from './config';
import { LogsDataAccessPlugin } from './plugin';

describe('logs data access telemetry initialization', () => {
  it('starts the service when event registration fails', () => {
    const initializer = coreMock.createPluginInitializerContext(configSchema.validate({}));
    const plugin = new LogsDataAccessPlugin(initializer);
    const setup = coreMock.createSetup();
    setup.analytics.registerEventType.mockImplementation(() => {
      throw new Error('analytics unavailable');
    });

    const persistableState = {
      extract: jest.fn(),
      inject: jest.fn(),
      telemetry: jest.fn(),
      getAllMigrations: jest.fn(),
    };
    expect(() =>
      plugin.setup(setup, {
        data: {
          ...dataPluginMock.createSetupContract(),
          query: { ...persistableState, filterManager: persistableState },
        },
      })
    ).not.toThrow();
    const start = plugin.start(coreMock.createStart(), {
      data: dataPluginMock.createStartContract(),
      dataViews: createIndexPatternsStartMock(),
    });
    expect(start.services.semanticLogSearch.search).toEqual(expect.any(Function));
    expect(initializer.logger.get().warn).toHaveBeenCalledWith(
      'Semantic log search completion telemetry could not be registered.'
    );
  });
});
