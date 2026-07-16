/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllLogsDataViewSpec } from '@kbn/discover-utils/src';
import { LogsLocatorDefinition } from './logs_locator';

const CUSTOM_LOG_PATTERN = 'custom-logs-*,remote:custom-logs-*';

const ALL_LOGS_DATA_VIEW_SPEC = getAllLogsDataViewSpec({ allLogsIndexPattern: CUSTOM_LOG_PATTERN });

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

    it('delegates with the all-logs data view spec when a query is given', async () => {
      const locator = createLocator(true);
      const callerQuery = { language: 'kuery', query: 'host.name: "my-host"' };

      await locator.getLocation({ query: callerQuery });

      expect(mockGetLocation).toHaveBeenCalledWith({
        dataViewSpec: ALL_LOGS_DATA_VIEW_SPEC,
        query: callerQuery,
      });
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
    it('delegates to DISCOVER_APP_LOCATOR with the all-logs data view spec', async () => {
      const locator = createLocator(false);

      await locator.getLocation({});

      expect(mockLocators.get).toHaveBeenCalledWith('DISCOVER_APP_LOCATOR');
      expect(mockGetFlattenedLogSources).toHaveBeenCalled();
      expect(mockGetLocation).toHaveBeenCalledWith({
        dataViewSpec: ALL_LOGS_DATA_VIEW_SPEC,
      });
    });

    it('does not delegate a bare dataViewId that relies on a profile-registered data view', async () => {
      const locator = createLocator(false);

      await locator.getLocation({});

      const delegatedParams = mockGetLocation.mock.calls[0][0];
      expect(delegatedParams).not.toHaveProperty('dataViewId');
      expect(delegatedParams.dataViewSpec.id).toBe(ALL_LOGS_DATA_VIEW_SPEC.id);
    });

    it('does not shadow a caller-provided dataViewId with the all-logs spec', async () => {
      const locator = createLocator(false);
      const callerQuery = { language: 'kuery', query: 'aws.cloudwatch.namespace: AWS/EC2' };

      await locator.getLocation({ dataViewId: 'metrics-*', query: callerQuery } as any);

      const delegatedParams = mockGetLocation.mock.calls[0][0];
      expect(delegatedParams).toEqual({ dataViewId: 'metrics-*', query: callerQuery });
      expect(delegatedParams).not.toHaveProperty('dataViewSpec');
      expect(mockGetFlattenedLogSources).not.toHaveBeenCalled();
    });

    it('does not shadow a caller-provided dataViewSpec with the all-logs spec', async () => {
      const locator = createLocator(false);
      const callerDataViewSpec = { title: 'logs-aws.ec2-*', timeFieldName: '@timestamp' };

      await locator.getLocation({ dataViewSpec: callerDataViewSpec } as any);

      const delegatedParams = mockGetLocation.mock.calls[0][0];
      expect(delegatedParams).toEqual({ dataViewSpec: callerDataViewSpec });
      expect(delegatedParams.dataViewSpec).not.toEqual(ALL_LOGS_DATA_VIEW_SPEC);
      expect(mockGetFlattenedLogSources).not.toHaveBeenCalled();
    });

    it('spreads consumer-provided params into the delegated call', async () => {
      const locator = createLocator(false);
      const extraParams = {
        timeRange: { from: 'now-1h', to: 'now' },
        columns: ['message', '@timestamp'],
      };

      await locator.getLocation(extraParams as any);

      expect(mockGetLocation).toHaveBeenCalledWith({
        dataViewSpec: ALL_LOGS_DATA_VIEW_SPEC,
        ...extraParams,
      });
    });
  });
});
