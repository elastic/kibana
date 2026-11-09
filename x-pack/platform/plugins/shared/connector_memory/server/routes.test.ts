/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { createRoutes } from './routes';

type Handler = (
  context: unknown,
  request: unknown,
  response: ReturnType<typeof httpServerMock.createResponseFactory>
) => Promise<unknown>;

const setup = ({ connectorType = '.google_drive', withWorkflows = true } = {}) => {
  const router = httpServiceMock.createRouter();
  const services = {
    getConnector: jest.fn(async () => ({
      actionTypeId: connectorType,
      authMode: 'per-user' as const,
    })),
    listConnectors: jest.fn().mockResolvedValue([
      { id: 'drive-1', name: 'Drive', actionTypeId: '.google_drive', authMode: 'per-user' },
      { id: 'slack-1', name: 'Slack', actionTypeId: '.slack' },
    ]),
    getSpaceId: jest.fn().mockReturnValue('default'),
    isContextEngineEnabled: jest.fn().mockResolvedValue(true),
    getProfileUid: jest.fn().mockResolvedValue('u_a'),
    esClient: jest.fn().mockReturnValue({}),
    runQuery: jest.fn().mockResolvedValue({
      columns: ['n', 'newest', 'connector_id', 'kind', 'yours'].map((name) => ({ name })),
      values: [
        [3, '2026-11-04T00:00:00Z', 'drive-1', 'llm', true],
        [2, '2026-11-03T00:00:00Z', 'drive-1', 'names', false],
      ],
    }),
  };
  const effective = {
    learn: 'reads',
    reach: 'direct',
    area: { maxFiles: 100, maxDepth: 2 },
    summarizeReads: false,
  };
  const settings = {
    describe: jest.fn().mockResolvedValue({ effective, customized: true }),
    save: jest.fn(),
    reset: jest.fn(),
  };
  const workflows = {
    read: jest.fn().mockResolvedValue({ status: 'idle' }),
    save: jest.fn(),
    remove: jest.fn(),
    runNow: jest.fn().mockResolvedValue(true),
  };
  createRoutes({
    router,
    services: services as never,
    store: { target: async () => 'ai-index-x' } as never,
    settings: settings as never,
    ...(withWorkflows && { workflows: workflows as never }),
  });

  const handlerOf = (method: 'get' | 'put' | 'delete' | 'post', path: RegExp) =>
    router[method].mock.calls.find(([config]) => path.test(config.path))?.[1] as Handler;
  const call = async (
    method: 'get' | 'put' | 'delete' | 'post',
    path: RegExp,
    body?: Record<string, unknown>
  ) => {
    const response = httpServerMock.createResponseFactory();
    await handlerOf(method, path)(
      {},
      httpServerMock.createKibanaRequest({ params: { connectorId: 'drive-1' }, body }),
      response
    );
    return response;
  };
  return { router, settings, workflows, call };
};

describe('routes', () => {
  it('lists the connectors memory can read, with what each holds', async () => {
    const { call } = setup();

    const response = await call('get', /\/connectors$/);

    const { connectors } = (
      response.ok.mock.calls[0][0] as {
        body: { connectors: Array<{ connectorId: string; documents: number; schedule: unknown }> };
      }
    ).body;
    expect(connectors).toEqual([
      expect.objectContaining({
        connectorId: 'drive-1',
        documents: 5,
        schedule: { status: 'idle' },
      }),
    ]);
  });

  it('reports a connector’s status: its settings, what is cached, and what the caller can see', async () => {
    const { call } = setup();

    const response = await call('get', /\/status\//);

    expect((response.ok.mock.calls[0][0] as { body: unknown }).body).toMatchObject({
      permissionScope: 'per_user',
      documents: { total: 5, visibleToYou: 3, byKind: { llm: 3, names: 2 } },
      crawlEnabled: true,
    });
  });

  it('saves the settings, and sets, keeps or removes the crawl as the body says', async () => {
    const { call, settings, workflows } = setup();
    const crawl = { maxDepth: 1, maxFiles: 100, mode: 'names', intervalMinutes: 1440 };

    await call('put', /\/settings\//, { reach: 'area', crawl });
    expect(settings.save).toHaveBeenCalledWith(expect.anything(), { reach: 'area' });
    expect(workflows.save).toHaveBeenCalledTimes(1);

    await call('put', /\/settings\//, { reach: 'direct' });
    expect(workflows.save).toHaveBeenCalledTimes(1);

    await call('put', /\/settings\//, { crawl: null });
    expect(workflows.remove).toHaveBeenCalledTimes(1);
  });

  it('saves nothing when the crawl is refused: no workflows plugin, a connector that cannot be crawled, or one that needs a starting location and has none', async () => {
    const crawl = { maxDepth: 1, maxFiles: 100, mode: 'names', intervalMinutes: 1440 };
    const cases = [
      setup({ withWorkflows: false }),
      setup({ connectorType: '.dropbox' }),
      setup({ connectorType: '.amazon_s3' }),
    ];

    const responses = await Promise.all(
      cases.map(({ call }) => call('put', /\/settings\//, { learn: 'off', crawl }))
    );

    responses.forEach((response) => expect(response.badRequest).toHaveBeenCalled());
    cases.forEach(({ settings }) => expect(settings.save).not.toHaveBeenCalled());
  });

  it('resets the settings and the crawl together, and runs the crawl now', async () => {
    const { call, settings, workflows } = setup();

    await call('delete', /\/settings\//);
    expect(settings.reset).toHaveBeenCalled();
    expect(workflows.remove).toHaveBeenCalled();

    const response = await call('post', /_run$/);
    expect(workflows.runNow).toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalled();
  });
});
