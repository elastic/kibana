/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_LOGS_DATA_VIEW_ID } from '@kbn/discover-utils/src';
import { LogsLocatorDefinition } from './logs_locator';

const CUSTOM_LOG_PATTERN = 'custom-logs-*,remote:custom-logs-*';

const mockGetLocation = jest.fn().mockResolvedValue({
  app: 'discover',
  path: '/mock-path',
  state: {},
});

const mockLocators = {
  get: jest.fn().mockReturnValue({ getLocation: mockGetLocation }),
};

const mockGetFlattenedLogSources = jest.fn().mockResolvedValue(CUSTOM_LOG_PATTERN);

const mockGetLogSourcesService = jest.fn().mockResolvedValue({
  getFlattenedLogSources: mockGetFlattenedLogSources,
});

const createLocator = (isEsqlDefault: boolean) =>
  new LogsLocatorDefinition({
    locators: mockLocators as any,
    getLogSourcesService: mockGetLogSourcesService,
    getIsEsqlDefault: jest.fn().mockResolvedValue(isEsqlDefault),
  });

describe('LogsLocatorDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when discover.isEsqlDefault is true', () => {
    it('delegates to DISCOVER_APP_LOCATOR with an ES|QL query when no query param is provided', async () => {
      const locator = createLocator(true);

      await locator.getLocation({});

      expect(mockLocators.get).toHaveBeenCalledWith('DISCOVER_APP_LOCATOR');
      expect(mockGetLocation).toHaveBeenCalledWith({
        query: { esql: `FROM ${CUSTOM_LOG_PATTERN}` },
      });
    });

    it('preserves the caller-provided query when one is given', async () => {
      const locator = createLocator(true);
      const callerQuery = { language: 'kuery', query: 'host.name: "my-host"' };

      await locator.getLocation({ query: callerQuery });

      expect(mockGetLocation).toHaveBeenCalledWith({
        dataViewId: ALL_LOGS_DATA_VIEW_ID,
        query: callerQuery,
      });
      expect(mockGetFlattenedLogSources).not.toHaveBeenCalled();
    });

    it('spreads consumer-provided params into the delegated call', async () => {
      const locator = createLocator(true);
      const extraParams = {
        timeRange: { from: 'now-15m', to: 'now' },
        filters: [{ meta: { alias: 'test' } }],
      };

      await locator.getLocation(extraParams as any);

      expect(mockGetLocation).toHaveBeenCalledWith({
        ...extraParams,
        query: { esql: `FROM ${CUSTOM_LOG_PATTERN}` },
      });
    });
  });

  describe('when discover.isEsqlDefault is false', () => {
    it('delegates to DISCOVER_APP_LOCATOR with dataViewId', async () => {
      const locator = createLocator(false);

      await locator.getLocation({});

      expect(mockLocators.get).toHaveBeenCalledWith('DISCOVER_APP_LOCATOR');
      expect(mockGetLocation).toHaveBeenCalledWith({
        dataViewId: ALL_LOGS_DATA_VIEW_ID,
      });
    });

    it('spreads consumer-provided params into the delegated call', async () => {
      const locator = createLocator(false);
      const extraParams = {
        timeRange: { from: 'now-1h', to: 'now' },
        columns: ['message', '@timestamp'],
      };

      await locator.getLocation(extraParams as any);

      expect(mockGetLocation).toHaveBeenCalledWith({
        dataViewId: ALL_LOGS_DATA_VIEW_ID,
        ...extraParams,
      });
    });
  });
});
