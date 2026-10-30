/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @jest-environment node
 */

import { errors } from '@elastic/elasticsearch';
import { kibanaResponseFactory } from '@kbn/core/server';
import type { CoreAuthenticationService } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import { API_PRIVILEGES, INTERNAL_API_BASE_PATH } from '../../common';
import type { TaskRunnerPocConfig } from '../config';
import { TaskRunnerServiceClient } from '../service_client';
import { createJobBodySchema, taskIdParamsSchema } from './schemas';
import { registerRoutes } from '.';

const SECRET = 'dev-secret-do-not-leak';
const CONFIG: TaskRunnerPocConfig = {
  serviceUrl: 'http://task-runner.test:8800',
  sharedSecret: SECRET,
  projectId: 'tenant-a',
};
const TASK_ID = 'job_01JBX4Q7M2ZK8V3N5R6T9W0YAB:1793631815000';
const JOB_ID = 'job_01JBX4Q7M2ZK8V3N5R6T9W0YAB';

type Method = 'get' | 'post' | 'delete';

const serviceResponse = (status: number, body?: object): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as Response);

const esError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type: 'test', reason: `status ${statusCode}` } },
    headers: {},
    warnings: [],
    meta: {},
  } as unknown as ConstructorParameters<typeof errors.ResponseError>[0]);

const setup = (config: TaskRunnerPocConfig = CONFIG) => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
  const router = mockRouter.create();
  const logger = loggingSystemMock.createLogger();
  const apiKeys = coreMock.createStart().security.authc.apiKeys as jest.Mocked<
    CoreAuthenticationService['apiKeys']
  >;
  apiKeys.grantAsInternalUser.mockResolvedValue({
    id: 'key-id',
    name: 'task_runner_poc one-shot job',
    api_key: 'key-secret',
  });
  registerRoutes({
    router,
    logger,
    projectId: config.projectId,
    serviceClient: new TaskRunnerServiceClient(config, fetchMock),
    getApiKeys: async () => apiKeys,
  });

  const coreContext = coreMock.createRequestHandlerContext();
  const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });

  const call = async (
    method: Method,
    path: string,
    { body, params, query }: { body?: object; params?: object; query?: object } = {}
  ) => {
    const route = router.versioned.getRoute(method, `${INTERNAL_API_BASE_PATH}${path}`);
    const request = mockRouter.createKibanaRequest({ method, body, params, query });
    return route.versions['1'].handler(context, request, kibanaResponseFactory);
  };

  const lastFetch = () => {
    const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    return {
      url: String(url),
      method: init?.method,
      headers: init?.headers as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
  };

  return { fetchMock, router, logger, apiKeys, coreContext, call, lastFetch };
};

describe('job routes', () => {
  it('creates a one-shot job with a 1h API key and an idempotency key', async () => {
    const { fetchMock, apiKeys, logger, call, lastFetch } = setup();
    fetchMock.mockResolvedValue(serviceResponse(202, { jobId: JOB_ID, taskId: TASK_ID }));

    const response = await call('post', '/jobs', {
      body: { query: 'FROM logs-* | LIMIT 1', idempotencyKey: 'kbn-abc' },
    });

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ jobId: JOB_ID, taskId: TASK_ID });
    expect(apiKeys.grantAsInternalUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        expiration: '1h',
        role_descriptors: {
          task: {
            indices: [
              { names: ['logs-*'], privileges: ['read', 'view_index_metadata'] },
              { names: ['tr-*'], privileges: ['read', 'write', 'view_index_metadata'] },
            ],
          },
        },
      })
    );
    const sent = lastFetch();
    expect(sent.url).toBe('http://task-runner.test:8800/v1/projects/tenant-a/jobs');
    expect(sent.method).toBe('POST');
    expect(sent.headers.Authorization).toBe(`Bearer ${SECRET}`);
    expect(sent.body).toEqual({
      taskType: 'esql_summary',
      params: { query: 'FROM logs-* | LIMIT 1', resultIndex: 'tr-results' },
      apiKey: Buffer.from('key-id:key-secret').toString('base64'),
      timeout: '60s',
      maxExecutions: 3,
      idempotencyKey: 'kbn-abc',
    });
    expect(logger.info).toHaveBeenCalledWith(
      `Created one-shot job ${JOB_ID}`,
      expect.objectContaining({
        task_runner: {
          project: { id: 'tenant-a' },
          job: { id: JOB_ID },
          task: { id: TASK_ID },
        },
      })
    );
  });

  it('creates a scheduled job with a key that never expires', async () => {
    const { fetchMock, apiKeys, call, lastFetch } = setup();
    fetchMock.mockResolvedValue(serviceResponse(202, { jobId: JOB_ID, taskId: null }));

    const response = await call('post', '/jobs', {
      body: { query: 'FROM logs-*', everySeconds: 10, idempotencyKey: 'kbn-def' },
    });

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ jobId: JOB_ID, taskId: null });
    expect(apiKeys.grantAsInternalUser.mock.calls[0][1]).not.toHaveProperty('expiration');
    expect(lastFetch().body).toMatchObject({ every: '10s', idempotencyKey: 'kbn-def' });
  });

  it('keeps a future runAt job key valid for an hour past runAt', async () => {
    const { fetchMock, apiKeys, call, lastFetch } = setup();
    fetchMock.mockResolvedValue(serviceResponse(202, { jobId: JOB_ID, taskId: null }));
    const runAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const response = await call('post', '/jobs', {
      body: { query: 'FROM logs-*', runAt: runAt.toISOString() },
    });

    expect(response.payload).toEqual({ jobId: JOB_ID, taskId: null });
    expect(apiKeys.grantAsInternalUser.mock.calls[0][1]).toMatchObject({
      expiration: `${2 * 3600 + 3600}s`,
    });
    expect(lastFetch().body).toMatchObject({ runAt: runAt.toISOString() });
    expect(lastFetch().body).not.toHaveProperty('every');
  });

  it('gives a past runAt the same 1h key as a job that fires right away', async () => {
    const { fetchMock, apiKeys, call, lastFetch } = setup();
    fetchMock.mockResolvedValue(serviceResponse(202, { jobId: JOB_ID, taskId: TASK_ID }));

    await call('post', '/jobs', { body: { query: 'FROM logs-*', runAt: '2020-01-01T00:00:00Z' } });

    expect(apiKeys.grantAsInternalUser.mock.calls[0][1]).toMatchObject({ expiration: '1h' });
    expect(lastFetch().body).toMatchObject({ runAt: '2020-01-01T00:00:00.000Z' });
  });

  it('sends runAt as the first occurrence of a scheduled job, with a key that never expires', async () => {
    const { fetchMock, apiKeys, call, lastFetch } = setup();
    fetchMock.mockResolvedValue(serviceResponse(202, { jobId: JOB_ID, taskId: null }));
    const runAt = new Date(Date.now() + 60_000).toISOString();

    await call('post', '/jobs', { body: { query: 'FROM logs-*', everySeconds: 30, runAt } });

    expect(apiKeys.grantAsInternalUser.mock.calls[0][1]).not.toHaveProperty('expiration');
    expect(lastFetch().body).toMatchObject({ every: '30s', runAt });
  });

  it('returns the first response again for a repeated idempotency key', async () => {
    const { fetchMock, call } = setup();
    fetchMock.mockImplementation(async () =>
      serviceResponse(202, { jobId: JOB_ID, taskId: TASK_ID })
    );
    const body = { query: 'FROM logs-*', idempotencyKey: 'kbn-same' };

    const first = await call('post', '/jobs', { body });
    const second = await call('post', '/jobs', { body });

    expect(second.payload).toEqual(first.payload);
    const sentKeys = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(sentKeys.map((sent) => sent.idempotencyKey)).toEqual(['kbn-same', 'kbn-same']);
  });

  it('generates an idempotency key when the caller sends none', async () => {
    const { fetchMock, call, lastFetch } = setup();
    fetchMock.mockResolvedValue(serviceResponse(202, { jobId: JOB_ID, taskId: TASK_ID }));

    await call('post', '/jobs', { body: { query: 'FROM logs-*' } });

    expect(lastFetch().body.idempotencyKey).toMatch(/^kbn-[0-9a-f-]{36}$/);
  });

  it("passes the service's validation errors through as 400", async () => {
    const { fetchMock, call } = setup();
    fetchMock.mockResolvedValue(
      serviceResponse(400, { error: { code: 'invalid_request', message: 'every: too short' } })
    );

    const response = await call('post', '/jobs', { body: { query: 'FROM logs-*' } });

    expect(response.status).toBe(400);
    expect(response.payload).toMatchObject({
      message: 'every: too short',
      attributes: { code: 'invalid_request' },
    });
  });

  it('turns a rejected shared secret into a 502 without leaking the secret', async () => {
    const { fetchMock, call } = setup();
    fetchMock.mockResolvedValue(
      serviceResponse(401, { error: { code: 'unauthorized', message: `bad token ${SECRET}` } })
    );

    const response = await call('get', '/jobs');

    expect(response.status).toBe(502);
    expect(JSON.stringify(response.payload)).not.toContain(SECRET);
  });

  it('reports an unknown project as a Kibana configuration problem', async () => {
    const { fetchMock, call } = setup();
    fetchMock.mockResolvedValue(
      serviceResponse(404, { error: { code: 'project_not_found', message: 'unknown project' } })
    );

    const response = await call('get', '/jobs');

    expect(response.status).toBe(502);
    expect(response.payload).toMatchObject({
      message: 'unknown project; check task_runner_poc.projectId',
    });
  });

  it('returns 502 when the service is unreachable', async () => {
    const { fetchMock, call } = setup();
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const response = await call('get', '/jobs');

    expect(response.status).toBe(502);
    expect(response.payload).toMatchObject({ attributes: { code: 'unreachable' } });
  });

  it('returns 500 and calls nothing when the shared secret is not configured', async () => {
    const { fetchMock, call } = setup({ ...CONFIG, sharedSecret: undefined });

    const response = await call('get', '/tasks');

    expect(response.status).toBe(500);
    expect(response.payload).toMatchObject({ attributes: { code: 'not_configured' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("doesn't call the service when API keys are disabled", async () => {
    const { fetchMock, apiKeys, call } = setup();
    apiKeys.grantAsInternalUser.mockResolvedValue(null);

    const response = await call('post', '/jobs', { body: { query: 'FROM logs-*' } });

    expect(response.status).toBe(500);
    expect(response.payload).toMatchObject({ attributes: { code: 'api_keys_disabled' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lists jobs with a limit', async () => {
    const { fetchMock, call, lastFetch } = setup();
    fetchMock.mockResolvedValue(serviceResponse(200, { jobs: [] }));

    const response = await call('get', '/jobs', { query: { limit: 20 } });

    expect(response.payload).toEqual({ jobs: [] });
    expect(lastFetch().url).toBe('http://task-runner.test:8800/v1/projects/tenant-a/jobs?limit=20');
  });

  it('gets one job', async () => {
    const { fetchMock, call, lastFetch } = setup();
    fetchMock.mockResolvedValue(serviceResponse(200, { jobId: JOB_ID }));

    const response = await call('get', '/jobs/{jobId}', { params: { jobId: JOB_ID } });

    expect(response.payload).toEqual({ jobId: JOB_ID });
    expect(lastFetch().url).toBe(
      `http://task-runner.test:8800/v1/projects/tenant-a/jobs/${JOB_ID}`
    );
  });

  it('deletes a job', async () => {
    const { fetchMock, call, lastFetch } = setup();
    fetchMock.mockResolvedValue(serviceResponse(204));

    const response = await call('delete', '/jobs/{jobId}', { params: { jobId: JOB_ID } });

    expect(response.status).toBe(204);
    expect(lastFetch().method).toBe('DELETE');
  });

  it('returns 404 for an unknown job', async () => {
    const { fetchMock, call } = setup();
    fetchMock.mockResolvedValue(
      serviceResponse(404, { error: { code: 'job_not_found', message: 'unknown job' } })
    );

    const response = await call('delete', '/jobs/{jobId}', { params: { jobId: JOB_ID } });

    expect(response.status).toBe(404);
  });
});

describe('task routes', () => {
  it('lists tasks', async () => {
    const { fetchMock, call, lastFetch } = setup();
    fetchMock.mockResolvedValue(serviceResponse(200, { tasks: [{ taskId: TASK_ID }] }));

    const response = await call('get', '/tasks');

    expect(response.payload).toEqual({ tasks: [{ taskId: TASK_ID }] });
    expect(lastFetch().url).toBe('http://task-runner.test:8800/v1/projects/tenant-a/tasks');
  });

  it('URL-encodes the task ID when getting one task', async () => {
    const { fetchMock, call, lastFetch } = setup();
    fetchMock.mockResolvedValue(serviceResponse(200, { taskId: TASK_ID }));

    await call('get', '/tasks/{taskId}', { params: { taskId: TASK_ID } });

    expect(lastFetch().url).toBe(
      'http://task-runner.test:8800/v1/projects/tenant-a/tasks/job_01JBX4Q7M2ZK8V3N5R6T9W0YAB%3A1793631815000'
    );
  });

  it("reads a task's output from tr-results as the current user", async () => {
    const { coreContext, call } = setup();
    const source = { taskId: TASK_ID, columns: [], values: [], rowCount: 0 };
    coreContext.elasticsearch.client.asCurrentUser.get.mockResolvedValue({
      _index: 'tr-results',
      _id: TASK_ID,
      found: true,
      _source: source,
    });

    const response = await call('get', '/tasks/{taskId}/output', { params: { taskId: TASK_ID } });

    expect(response.status).toBe(200);
    expect(response.payload).toEqual(source);
    expect(coreContext.elasticsearch.client.asCurrentUser.get).toHaveBeenCalledWith({
      index: 'tr-results',
      id: TASK_ID,
    });
    expect(coreContext.elasticsearch.client.asInternalUser.get).not.toHaveBeenCalled();
  });

  it('returns 404 when the output document is missing', async () => {
    const { coreContext, call } = setup();
    coreContext.elasticsearch.client.asCurrentUser.get.mockRejectedValue(esError(404));

    const response = await call('get', '/tasks/{taskId}/output', { params: { taskId: TASK_ID } });

    expect(response.status).toBe(404);
  });

  it("passes Elasticsearch's 403 through when the user can't read tr-results", async () => {
    const { coreContext, call } = setup();
    coreContext.elasticsearch.client.asCurrentUser.get.mockRejectedValue(esError(403));

    const response = await call('get', '/tasks/{taskId}/output', { params: { taskId: TASK_ID } });

    expect(response.status).toBe(403);
  });
});

describe('route access and validation', () => {
  it('requires the read privilege to read and the manage privilege to change jobs', () => {
    const { router } = setup();
    const privileges = (method: Method, path: string) =>
      router.versioned.getRoute(method, `${INTERNAL_API_BASE_PATH}${path}`).config.security;

    expect(privileges('post', '/jobs')).toEqual({
      authz: { requiredPrivileges: [API_PRIVILEGES.manage] },
    });
    expect(privileges('delete', '/jobs/{jobId}')).toEqual({
      authz: { requiredPrivileges: [API_PRIVILEGES.manage] },
    });
    for (const path of [
      '/jobs',
      '/jobs/{jobId}',
      '/tasks',
      '/tasks/{taskId}',
      '/tasks/{taskId}/output',
    ]) {
      expect(privileges('get', path)).toEqual({
        authz: { requiredPrivileges: [API_PRIVILEGES.read] },
      });
    }
  });

  it('rejects task IDs that are not {jobId}:{firedAtMs}', () => {
    expect(() => taskIdParamsSchema.validate({ taskId: TASK_ID })).not.toThrow();
    expect(() => taskIdParamsSchema.validate({ taskId: '../../_security' })).toThrow();
  });

  it('accepts only whole seconds for every', () => {
    expect(() => createJobBodySchema.validate({ query: 'FROM x', everySeconds: 10 })).not.toThrow();
    expect(() => createJobBodySchema.validate({ query: 'FROM x', everySeconds: 1.5 })).toThrow();
    expect(() => createJobBodySchema.validate({ query: 'FROM x', everySeconds: 0 })).toThrow();
  });

  it('accepts only date-times for runAt', () => {
    expect(() =>
      createJobBodySchema.validate({ query: 'FROM x', runAt: '2026-11-04T02:00:00.000Z' })
    ).not.toThrow();
    expect(() => createJobBodySchema.validate({ query: 'FROM x', runAt: 'tomorrow' })).toThrow();
  });
});
