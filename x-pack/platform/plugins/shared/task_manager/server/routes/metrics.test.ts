/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { of, Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { MetricsRouteParams } from './metrics';
import { metricsRoute } from './metrics';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { redactMetrics } from '../lib/redact_monitoring_stats';
import {
  createNodeMetricsWithTaskTypes,
  MOCK_TASK_TYPE,
  MOCK_TASK_TYPE_GROUP,
} from '../lib/redact_monitoring_stats.mock';

const createMockClusterClient = ({
  monitor = false,
  manageTaskManager = false,
}: {
  monitor?: boolean;
  manageTaskManager?: boolean;
}) => {
  const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
  mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResponse({
    username: 'user',
    has_all_requested: monitor && manageTaskManager,
    cluster: { monitor },
    index: {},
    application: { 'kibana-.kibana': { '*': { 'api:manage_taskManager': manageTaskManager } } },
  });

  const mockClusterClient = elasticsearchServiceMock.createClusterClient();
  mockClusterClient.asScoped.mockReturnValue(mockScopedClusterClient);

  return { mockClusterClient, mockScopedClusterClient };
};

const getPrivilegedClusterClient = () =>
  Promise.resolve(
    createMockClusterClient({ monitor: true, manageTaskManager: true }).mockClusterClient
  );

const getUnprivilegedClusterClient = () =>
  Promise.resolve(createMockClusterClient({}).mockClusterClient);

describe('metricsRoute', () => {
  let logger: Logger;
  beforeEach(() => {
    jest.resetAllMocks();
    logger = loggingSystemMock.createLogger();
  });

  it('registers route', async () => {
    const router = httpServiceMock.createRouter();
    metricsRoute({
      router,
      logger,
      metrics$: of(),
      resetMetrics$: new Subject<boolean>(),
      taskManagerId: uuidv4(),
      kibanaIndexName: '.kibana',
      getClusterClient: getPrivilegedClusterClient,
      getIsSecurityEnabled: () => true,
    });

    const [config] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/task_manager/metrics"`);
    expect(config.options?.tags).toEqual(['security:acceptJWT']);
  });

  it('emits resetMetric$ event when route is accessed and reset query param is true', async () => {
    let resetCalledTimes = 0;
    const resetMetrics$ = new Subject<boolean>();

    resetMetrics$.subscribe(() => {
      resetCalledTimes++;
    });
    const router = httpServiceMock.createRouter();
    metricsRoute({
      router,
      logger,
      metrics$: of(),
      resetMetrics$,
      taskManagerId: uuidv4(),
      kibanaIndexName: '.kibana',
      getClusterClient: getPrivilegedClusterClient,
      getIsSecurityEnabled: () => true,
    });

    const [config, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, { query: { reset: true } }, ['ok']);

    expect(config.path).toMatchInlineSnapshot(`"/api/task_manager/metrics"`);

    await handler(context, req, res);

    expect(resetCalledTimes).toEqual(1);
  });

  it('does not emit resetMetric$ event when route is accessed and reset query param is false', async () => {
    let resetCalledTimes = 0;
    const resetMetrics$ = new Subject<boolean>();

    resetMetrics$.subscribe(() => {
      resetCalledTimes++;
    });
    const router = httpServiceMock.createRouter();
    metricsRoute({
      router,
      logger,
      metrics$: of(),
      resetMetrics$,
      taskManagerId: uuidv4(),
      kibanaIndexName: '.kibana',
      getClusterClient: getPrivilegedClusterClient,
      getIsSecurityEnabled: () => true,
    });

    const [config, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, { query: { reset: false } }, ['ok']);

    expect(config.path).toMatchInlineSnapshot(`"/api/task_manager/metrics"`);

    await handler(context, req, res);

    expect(resetCalledTimes).toEqual(0);
  });

  describe('monitoring privileges', () => {
    const callHandlerWithTaskTypeMetrics = async (
      params: Pick<MetricsRouteParams, 'getClusterClient' | 'getIsSecurityEnabled'>
    ) => {
      const resetMetrics$ = new Subject<boolean>();
      const onReset = jest.fn();
      resetMetrics$.subscribe(onReset);
      const { last_update: lastUpdate, metrics } = createNodeMetricsWithTaskTypes();
      const router = httpServiceMock.createRouter();
      metricsRoute({
        router,
        logger,
        metrics$: of({ last_update: lastUpdate, metrics }),
        resetMetrics$,
        taskManagerId: uuidv4(),
        kibanaIndexName: '.kibana',
        ...params,
      });

      const [, handler] = router.get.mock.calls[0];
      const [context, req, res] = mockHandlerArguments({}, { query: { reset: true } }, ['ok']);
      await handler(context, req, res);
      return { res, onReset };
    };

    it('returns redacted metrics and ignores reset when user has neither the cluster monitor nor the manage_taskManager privilege', async () => {
      const { res, onReset } = await callHandlerWithTaskTypeMetrics({
        getClusterClient: getUnprivilegedClusterClient,
        getIsSecurityEnabled: () => true,
      });

      expect(onReset).not.toHaveBeenCalled();
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          metrics: redactMetrics(createNodeMetricsWithTaskTypes()).metrics,
        }),
      });
      const responseJson = JSON.stringify(jest.mocked(res.ok).mock.calls);
      expect(responseJson).not.toContain(MOCK_TASK_TYPE.replaceAll('.', '__'));
      expect(responseJson).not.toContain(`"${MOCK_TASK_TYPE_GROUP}"`);
    });

    it('returns redacted metrics and ignores reset when the privilege check fails', async () => {
      const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({});
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockRejectedValue(
        new Error('boom')
      );

      const { res, onReset } = await callHandlerWithTaskTypeMetrics({
        getClusterClient: () => Promise.resolve(mockClusterClient),
        getIsSecurityEnabled: () => true,
      });

      expect(onReset).not.toHaveBeenCalled();
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          metrics: redactMetrics(createNodeMetricsWithTaskTypes()).metrics,
        }),
      });
    });

    it('returns full metrics and resets when user only has the cluster monitor privilege', async () => {
      const { res, onReset } = await callHandlerWithTaskTypeMetrics({
        getClusterClient: () =>
          Promise.resolve(createMockClusterClient({ monitor: true }).mockClusterClient),
        getIsSecurityEnabled: () => true,
      });

      expect(onReset).toHaveBeenCalledTimes(1);
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({ metrics: createNodeMetricsWithTaskTypes().metrics }),
      });
    });

    it('returns full metrics and resets when user only has the manage_taskManager privilege', async () => {
      const { res, onReset } = await callHandlerWithTaskTypeMetrics({
        getClusterClient: () =>
          Promise.resolve(createMockClusterClient({ manageTaskManager: true }).mockClusterClient),
        getIsSecurityEnabled: () => true,
      });

      expect(onReset).toHaveBeenCalledTimes(1);
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({ metrics: createNodeMetricsWithTaskTypes().metrics }),
      });
    });

    it('returns full metrics and resets without checking privileges when security is disabled', async () => {
      const { mockClusterClient, mockScopedClusterClient } = createMockClusterClient({});

      const { res, onReset } = await callHandlerWithTaskTypeMetrics({
        getClusterClient: () => Promise.resolve(mockClusterClient),
        getIsSecurityEnabled: () => false,
      });

      expect(mockScopedClusterClient.asCurrentUser.security.hasPrivileges).not.toHaveBeenCalled();
      expect(onReset).toHaveBeenCalledTimes(1);
      expect(res.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({ metrics: createNodeMetricsWithTaskTypes().metrics }),
      });
    });
  });
});
