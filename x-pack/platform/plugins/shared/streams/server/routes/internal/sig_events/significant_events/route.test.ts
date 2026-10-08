/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { getSignificantEventsQueriesGenerationTaskId } from '../../../../lib/sig_events/tasks/significant_events_queries_generation';
import { internalSignificantEventsRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const statusRoute =
  internalSignificantEventsRoutes['GET /internal/streams/{name}/significant_events/_status'];

type StatusHandlerParams = Parameters<typeof statusRoute.handler>[0];

const STREAM = 'logs.forbidden';

const makeTaskClient = () => ({
  getStatus: jest.fn().mockResolvedValue({ status: 'not_started' }),
});

const makeTelemetry = () => ({
  startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
  reportStreamsStateError: jest.fn(),
});

describe('significant events query generation status route', () => {
  it('rejects callers without read access to the stream before reading status', async () => {
    const assertReadAccess = jest
      .fn()
      .mockRejectedValue(new SecurityError('Cannot read stream, insufficient privileges'));
    const taskClient = makeTaskClient();

    const handlerParams = {
      params: { path: { name: STREAM } },
      request: {},
      server: {},
      telemetry: makeTelemetry(),
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        uiSettingsClient: {},
        taskClient,
        streamsClient: { assertReadAccess },
      }),
    } as unknown as StatusHandlerParams;

    await expect(statusRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(assertReadAccess).toHaveBeenCalledWith(STREAM);
    expect(taskClient.getStatus).not.toHaveBeenCalled();
  });

  it('returns task status for callers with read access', async () => {
    const assertReadAccess = jest.fn().mockResolvedValue(undefined);
    const taskClient = makeTaskClient();

    const handlerParams = {
      params: { path: { name: STREAM } },
      request: {},
      server: {},
      telemetry: makeTelemetry(),
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        uiSettingsClient: {},
        taskClient,
        streamsClient: { assertReadAccess },
      }),
    } as unknown as StatusHandlerParams;

    await expect(statusRoute.handler(handlerParams)).resolves.toEqual({ status: 'not_started' });
    expect(assertReadAccess).toHaveBeenCalledWith(STREAM);
    expect(taskClient.getStatus).toHaveBeenCalledWith(
      getSignificantEventsQueriesGenerationTaskId(STREAM)
    );
  });
});
