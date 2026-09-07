/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityError } from '@kbn/streams-plugin/server/lib/streams/errors/security_error';
import { internalKIOnboardingRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../utils/assert_not_paused', () => ({
  assertNotPaused: jest.fn().mockResolvedValue(undefined),
}));

const statusRoute =
  internalKIOnboardingRoutes['GET /internal/streams/{streamName}/onboarding/_status'];
const executeRoute =
  internalKIOnboardingRoutes['POST /internal/streams/{streamName}/onboarding/_execute'];
const bulkStatusRoute =
  internalKIOnboardingRoutes['POST /internal/streams/onboarding/_bulk_status'];

type StatusHandlerParams = Parameters<typeof statusRoute.handler>[0];
type ExecuteHandlerParams = Parameters<typeof executeRoute.handler>[0];
type BulkStatusHandlerParams = Parameters<typeof bulkStatusRoute.handler>[0];

const STREAM = 'logs.forbidden';

const makeOnboardingClient = () => ({
  run: jest.fn().mockResolvedValue({ executionId: 'exec-1' }),
  cancel: jest.fn().mockResolvedValue(null),
  getStatus: jest.fn().mockResolvedValue({ status: 'not_started', executionId: null }),
  getStatuses: jest.fn().mockResolvedValue({}),
});

const makeScopedClients = ({
  assertReadAccess = jest.fn().mockResolvedValue(undefined),
  ensureStream = jest.fn().mockResolvedValue(undefined),
  getReadableStreamNames = jest.fn().mockImplementation(async (names: string[]) => names),
}: {
  assertReadAccess?: jest.Mock;
  ensureStream?: jest.Mock;
  getReadableStreamNames?: jest.Mock;
} = {}) => ({
  licensing: {},
  streamsClient: { assertReadAccess, ensureStream, getReadableStreamNames },
});

describe('onboarding status route', () => {
  it('rejects callers without read access to the stream before reading status', async () => {
    const assertReadAccess = jest
      .fn()
      .mockRejectedValue(new SecurityError('Cannot read stream, insufficient privileges'));
    const ensureStream = jest.fn();
    const onboardingClient = makeOnboardingClient();

    const handlerParams = {
      params: { path: { streamName: STREAM } },
      request: {},
      server: {},
      getScopedClients: jest
        .fn()
        .mockResolvedValue(makeScopedClients({ assertReadAccess, ensureStream })),
      workflowClients: { streamsKIsOnboardingClient: onboardingClient },
    } as unknown as StatusHandlerParams;

    await expect(statusRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(assertReadAccess).toHaveBeenCalledWith(STREAM);
    expect(ensureStream).not.toHaveBeenCalled();
    expect(onboardingClient.getStatus).not.toHaveBeenCalled();
  });

  it('returns status for callers with read access without writing stream state', async () => {
    const assertReadAccess = jest.fn().mockResolvedValue(undefined);
    const ensureStream = jest.fn();
    const onboardingClient = makeOnboardingClient();

    const handlerParams = {
      params: { path: { streamName: STREAM } },
      request: {},
      server: {},
      getScopedClients: jest
        .fn()
        .mockResolvedValue(makeScopedClients({ assertReadAccess, ensureStream })),
      workflowClients: { streamsKIsOnboardingClient: onboardingClient },
    } as unknown as StatusHandlerParams;

    await expect(statusRoute.handler(handlerParams)).resolves.toEqual({
      status: 'not_started',
      executionId: null,
    });
    expect(assertReadAccess).toHaveBeenCalledWith(STREAM);
    expect(ensureStream).not.toHaveBeenCalled();
    expect(onboardingClient.getStatus).toHaveBeenCalledWith({ streamName: STREAM });
  });
});

describe('onboarding execute route', () => {
  const scheduleBody = {
    action: 'schedule' as const,
    from: 1,
    to: 2,
    steps: ['features_identification', 'queries_generation'],
    connectors: undefined,
  };

  it('rejects schedule for callers without access to the stream', async () => {
    const ensureStream = jest
      .fn()
      .mockRejectedValue(new SecurityError('Cannot read stream, insufficient privileges'));
    const onboardingClient = makeOnboardingClient();

    const handlerParams = {
      params: { path: { streamName: STREAM }, body: scheduleBody },
      request: {},
      server: {},
      getScopedClients: jest.fn().mockResolvedValue(makeScopedClients({ ensureStream })),
      workflowClients: { streamsKIsOnboardingClient: onboardingClient },
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
    } as unknown as ExecuteHandlerParams;

    await expect(executeRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(ensureStream).toHaveBeenCalledWith(STREAM);
    expect(onboardingClient.run).not.toHaveBeenCalled();
  });

  it('rejects cancel for callers without access to the stream', async () => {
    const ensureStream = jest
      .fn()
      .mockRejectedValue(new SecurityError('Cannot read stream, insufficient privileges'));
    const onboardingClient = makeOnboardingClient();

    const handlerParams = {
      params: { path: { streamName: STREAM }, body: { action: 'cancel' as const } },
      request: {},
      server: {},
      getScopedClients: jest.fn().mockResolvedValue(makeScopedClients({ ensureStream })),
      workflowClients: { streamsKIsOnboardingClient: onboardingClient },
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
    } as unknown as ExecuteHandlerParams;

    await expect(executeRoute.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(ensureStream).toHaveBeenCalledWith(STREAM);
    expect(onboardingClient.cancel).not.toHaveBeenCalled();
    expect(onboardingClient.getStatus).not.toHaveBeenCalled();
  });

  it('schedules for callers with access to the stream', async () => {
    const ensureStream = jest.fn().mockResolvedValue(undefined);
    const onboardingClient = makeOnboardingClient();

    const handlerParams = {
      params: { path: { streamName: STREAM }, body: scheduleBody },
      request: {},
      server: {},
      getScopedClients: jest.fn().mockResolvedValue(makeScopedClients({ ensureStream })),
      workflowClients: { streamsKIsOnboardingClient: onboardingClient },
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
    } as unknown as ExecuteHandlerParams;

    await expect(executeRoute.handler(handlerParams)).resolves.toEqual({
      status: 'in_progress',
      executionId: 'exec-1',
    });
    expect(ensureStream).toHaveBeenCalledWith(STREAM);
    expect(onboardingClient.run).toHaveBeenCalledTimes(1);
  });
});

describe('onboarding bulk status route', () => {
  it('only queries and returns statuses for streams the caller can read', async () => {
    const getReadableStreamNames = jest.fn().mockResolvedValue(['logs.allowed']);
    const onboardingClient = makeOnboardingClient();
    onboardingClient.getStatuses.mockResolvedValue({
      'logs.allowed': { status: 'not_started', executionId: null },
    });

    const handlerParams = {
      params: { body: { streamNames: ['logs.allowed', 'logs.forbidden'] } },
      request: {},
      server: {},
      getScopedClients: jest.fn().mockResolvedValue(makeScopedClients({ getReadableStreamNames })),
      workflowClients: { streamsKIsOnboardingClient: onboardingClient },
    } as unknown as BulkStatusHandlerParams;

    const result = await bulkStatusRoute.handler(handlerParams);

    expect(getReadableStreamNames).toHaveBeenCalledWith(['logs.allowed', 'logs.forbidden']);
    expect(onboardingClient.getStatuses).toHaveBeenCalledWith({ streamNames: ['logs.allowed'] });
    expect(result).toEqual({ 'logs.allowed': { status: 'not_started', executionId: null } });
    expect(result['logs.forbidden']).toBeUndefined();
  });

  it('returns an empty object without querying when no stream is readable', async () => {
    const getReadableStreamNames = jest.fn().mockResolvedValue([]);
    const onboardingClient = makeOnboardingClient();

    const handlerParams = {
      params: { body: { streamNames: ['logs.forbidden'] } },
      request: {},
      server: {},
      getScopedClients: jest.fn().mockResolvedValue(makeScopedClients({ getReadableStreamNames })),
      workflowClients: { streamsKIsOnboardingClient: onboardingClient },
    } as unknown as BulkStatusHandlerParams;

    await expect(bulkStatusRoute.handler(handlerParams)).resolves.toEqual({});
    expect(onboardingClient.getStatuses).not.toHaveBeenCalled();
  });
});
