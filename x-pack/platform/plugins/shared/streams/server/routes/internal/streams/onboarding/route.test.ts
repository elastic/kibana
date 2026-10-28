/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/streams-schema';
import { getOnboardingTaskId } from '../../../../lib/tasks/task_definitions/onboarding';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { internalOnboardingRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const statusRoute =
  internalOnboardingRoutes['GET /internal/streams/{streamName}/onboarding/_status'];
const taskRoute = internalOnboardingRoutes['POST /internal/streams/{streamName}/onboarding/_task'];

type StatusHandlerParams = Parameters<typeof statusRoute.handler>[0];
type TaskHandlerParams = Parameters<typeof taskRoute.handler>[0];

const STREAM = 'logs.forbidden';
const VICTIM_STREAM = 'logs.secret';
const COLLIDING_STREAM = `${VICTIM_STREAM}_no_save_queries`;

const makeTaskClient = () => ({
  getStatus: jest.fn().mockResolvedValue({ status: 'not_started' }),
  schedule: jest.fn(),
  cancel: jest.fn(),
  acknowledge: jest.fn(),
  get: jest.fn().mockResolvedValue({ status: 'not_started' }),
});

const makeTelemetry = () => ({
  startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
  reportStreamsStateError: jest.fn(),
});

describe('onboarding status route', () => {
  it('rejects callers without read access to the stream', async () => {
    const assertReadAccess = jest
      .fn()
      .mockRejectedValue(new SecurityError('Cannot read stream, insufficient privileges'));
    const ensureStream = jest.fn();
    const taskClient = makeTaskClient();

    const handlerParams = {
      params: { path: { streamName: STREAM }, query: { saveQueries: false } },
      request: {},
      server: {},
      telemetry: makeTelemetry(),
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        uiSettingsClient: {},
        taskClient,
        streamsClient: { assertReadAccess, ensureStream },
      }),
    } as unknown as StatusHandlerParams;

    await expect(statusRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(assertReadAccess).toHaveBeenCalledWith(STREAM);
    expect(ensureStream).not.toHaveBeenCalled();
    expect(taskClient.getStatus).not.toHaveBeenCalled();
  });

  it('returns task status for callers with read access without writing stream state', async () => {
    const assertReadAccess = jest.fn().mockResolvedValue(undefined);
    const ensureStream = jest.fn();
    const taskClient = makeTaskClient();

    const handlerParams = {
      params: { path: { streamName: STREAM }, query: { saveQueries: false } },
      request: {},
      server: {},
      telemetry: makeTelemetry(),
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        uiSettingsClient: {},
        taskClient,
        streamsClient: { assertReadAccess, ensureStream },
      }),
    } as unknown as StatusHandlerParams;

    await expect(statusRoute.handler(handlerParams)).resolves.toEqual({ status: 'not_started' });
    expect(assertReadAccess).toHaveBeenCalledWith(STREAM);
    expect(ensureStream).not.toHaveBeenCalled();
    expect(taskClient.getStatus).toHaveBeenCalledWith(
      'streams_onboarding_logs.forbidden_no_save_queries'
    );
  });

  it("does not return another stream's completed payload when task IDs collide", async () => {
    expect(getOnboardingTaskId(VICTIM_STREAM, false)).toBe(
      getOnboardingTaskId(COLLIDING_STREAM, true)
    );

    const assertReadAccess = jest.fn().mockResolvedValue(undefined);
    const taskClient = makeTaskClient();
    taskClient.get.mockResolvedValue({
      status: TaskStatus.Completed,
      task: {
        params: { streamName: VICTIM_STREAM, saveQueries: false },
        payload: { featuresTaskResult: { log_samples: ['secret-doc'] } },
      },
    });
    taskClient.getStatus.mockResolvedValue({
      status: TaskStatus.Completed,
      featuresTaskResult: { log_samples: ['secret-doc'] },
    });

    const handlerParams = {
      params: { path: { streamName: COLLIDING_STREAM }, query: { saveQueries: true } },
      request: {},
      server: {},
      telemetry: makeTelemetry(),
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        uiSettingsClient: {},
        taskClient,
        streamsClient: { assertReadAccess, ensureStream: jest.fn() },
      }),
    } as unknown as StatusHandlerParams;

    await expect(statusRoute.handler(handlerParams)).resolves.toEqual({
      status: TaskStatus.NotStarted,
    });
    expect(assertReadAccess).toHaveBeenCalledWith(COLLIDING_STREAM);
    expect(taskClient.getStatus).not.toHaveBeenCalled();
  });
});

describe('onboarding task route', () => {
  it('rejects cancel for callers without access to the stream', async () => {
    const ensureStream = jest
      .fn()
      .mockRejectedValue(new SecurityError('Cannot read stream, insufficient privileges'));
    const taskClient = makeTaskClient();

    const handlerParams = {
      params: {
        path: { streamName: STREAM },
        query: { saveQueries: true },
        body: { action: 'cancel' },
      },
      request: {},
      server: {},
      telemetry: makeTelemetry(),
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        uiSettingsClient: {},
        taskClient,
        streamsClient: { ensureStream },
      }),
    } as unknown as TaskHandlerParams;

    await expect(taskRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(ensureStream).toHaveBeenCalledWith(STREAM);
    expect(taskClient.cancel).not.toHaveBeenCalled();
    expect(taskClient.schedule).not.toHaveBeenCalled();
  });

  it("does not schedule over another stream's task when task IDs collide", async () => {
    expect(getOnboardingTaskId(VICTIM_STREAM, false)).toBe(
      getOnboardingTaskId(COLLIDING_STREAM, true)
    );

    const ensureStream = jest.fn().mockResolvedValue(undefined);
    const taskClient = makeTaskClient();
    taskClient.get.mockResolvedValue({
      status: TaskStatus.Completed,
      task: {
        params: { streamName: VICTIM_STREAM, saveQueries: false },
        payload: { featuresTaskResult: { log_samples: ['secret-doc'] } },
      },
    });

    const handlerParams = {
      params: {
        path: { streamName: COLLIDING_STREAM },
        query: { saveQueries: true },
        body: {
          action: 'schedule',
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-01-02T00:00:00.000Z',
        },
      },
      request: {},
      server: {},
      telemetry: makeTelemetry(),
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        uiSettingsClient: {},
        taskClient,
        streamsClient: { ensureStream },
      }),
    } as unknown as TaskHandlerParams;

    await expect(taskRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
    expect(ensureStream).toHaveBeenCalledWith(COLLIDING_STREAM);
    expect(taskClient.schedule).not.toHaveBeenCalled();
    expect(taskClient.cancel).not.toHaveBeenCalled();
  });
});
