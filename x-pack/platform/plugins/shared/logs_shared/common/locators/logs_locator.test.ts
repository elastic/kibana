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

const createLocator = ({
  isEsqlDefault = false,
}: {
  isEsqlDefault?: boolean;
} = {}) =>
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
      const locator = createLocator({ isEsqlDefault: true });

      await locator.getLocation({});

      expect(mockLocators.get).toHaveBeenCalledWith('DISCOVER_APP_LOCATOR');
      expect(mockGetLocation).toHaveBeenCalledWith({
        query: { esql: `FROM ${CUSTOM_LOG_PATTERN}` },
      });
    });

    it('falls through to the data view resolution when a query is given', async () => {
      const locator = createLocator({ isEsqlDefault: true });
      const callerQuery = { language: 'kuery', query: 'host.name: "my-host"' };

      await locator.getLocation({ query: callerQuery });

      expect(mockGetLocation).toHaveBeenCalledWith({
        dataViewSpec: ALL_LOGS_DATA_VIEW_SPEC,
        query: callerQuery,
      });
      expect(mockGetFlattenedLogSources).toHaveBeenCalled();
    });

    it('spreads consumer-provided params into the delegated call', async () => {
      const locator = createLocator({ isEsqlDefault: true });
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
    describe('by default', () => {
      it('builds and delegates the all-logs ad-hoc data view spec', async () => {
        const locator = createLocator();

        await locator.getLocation({});

        expect(mockLocators.get).toHaveBeenCalledWith('DISCOVER_APP_LOCATOR');
        const delegatedParams = mockGetLocation.mock.calls[0][0];
        expect(mockGetFlattenedLogSources).toHaveBeenCalled();
        expect(delegatedParams.dataViewSpec).toEqual(ALL_LOGS_DATA_VIEW_SPEC);
        expect(delegatedParams).not.toHaveProperty('dataViewId');
      });

      it('delegates a managed spec, so the data view matches the one the root profiles register', async () => {
        const locator = createLocator();

        await locator.getLocation({});

        expect(mockGetLocation.mock.calls[0][0].dataViewSpec.managed).toBe(true);
      });

      it('spreads consumer-provided params into the delegated call', async () => {
        const locator = createLocator();
        const extraParams = {
          timeRange: { from: 'now-1h', to: 'now' },
          columns: ['message', '@timestamp'],
        };

        await locator.getLocation(extraParams as any);

        const delegatedParams = mockGetLocation.mock.calls[0][0];
        expect(delegatedParams.dataViewSpec).toEqual(ALL_LOGS_DATA_VIEW_SPEC);
        expect(delegatedParams.timeRange).toEqual(extraParams.timeRange);
        expect(delegatedParams.columns).toEqual(extraParams.columns);
      });
    });

    describe('when the caller provides a data view', () => {
      it('respects a caller-provided dataViewId', async () => {
        const locator = createLocator();
        const callerQuery = { language: 'kuery', query: 'aws.cloudwatch.namespace: AWS/EC2' };

        await locator.getLocation({ dataViewId: 'metrics-*', query: callerQuery } as any);

        const delegatedParams = mockGetLocation.mock.calls[0][0];
        expect(delegatedParams).toEqual({ dataViewId: 'metrics-*', query: callerQuery });
        expect(delegatedParams).not.toHaveProperty('dataViewSpec');
        expect(mockGetFlattenedLogSources).not.toHaveBeenCalled();
      });

      it('respects a caller-provided dataViewSpec', async () => {
        const locator = createLocator();
        const callerDataViewSpec = { title: 'logs-aws.ec2-*', timeFieldName: '@timestamp' };

        await locator.getLocation({ dataViewSpec: callerDataViewSpec } as any);

        const delegatedParams = mockGetLocation.mock.calls[0][0];
        expect(delegatedParams).toEqual({ dataViewSpec: callerDataViewSpec });
        expect(delegatedParams.dataViewSpec).not.toEqual(ALL_LOGS_DATA_VIEW_SPEC);
        expect(mockGetFlattenedLogSources).not.toHaveBeenCalled();
      });
    });
  });
});
