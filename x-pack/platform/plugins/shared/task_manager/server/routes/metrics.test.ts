/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { of, Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { metricsRoute } from './metrics';
import { mockHandlerArguments } from './_mock_handler_arguments';

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
    });

    const [config, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({}, { query: { reset: false } }, ['ok']);

    expect(config.path).toMatchInlineSnapshot(`"/api/task_manager/metrics"`);

    await handler(context, req, res);

    expect(resetCalledTimes).toEqual(0);
  });
});
