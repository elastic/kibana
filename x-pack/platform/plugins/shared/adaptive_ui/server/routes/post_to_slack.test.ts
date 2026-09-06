/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { MAX_VIEW_SPEC_BYTES, adaptiveUiApiPaths } from '../../common/http_api';
import type { KibanaPublicUrlHttp } from '../kibana_public_url';
import { registerPostToSlackRoute } from './post_to_slack';

// The real renderer pulls in native `@takumi-rs/core`; these
// tests cover the route around the pipeline, not the pixels.
jest.mock('../slack/render_png', () => ({
  renderNodePng: jest.fn().mockResolvedValue(Buffer.from('fake-png')),
}));

const validSpec = {
  type: 'view',
  title: 'Open cases',
  body: [{ type: 'text', body: 'Two cases need triage.' }],
};

const specWithHref = {
  type: 'view',
  title: 'Open cases',
  body: [
    {
      type: 'entityList',
      label: 'Cases',
      items: [{ title: 'Triage me', action: { label: 'Open', href: '/app/security/cases/1' } }],
    },
  ],
};

const http: KibanaPublicUrlHttp = {
  basePath: { publicBaseUrl: 'https://kibana.example.com', prepend: (path) => path },
  getServerInfo: () => ({ protocol: 'http', hostname: 'localhost', port: 5601 }),
};

const registerRoute = (execute: jest.Mock) => {
  const router = httpServiceMock.createRouter();
  const logger = loggingSystemMock.createLogger();
  const getActions = jest.fn().mockResolvedValue({
    getActionsClientWithRequest: jest.fn().mockResolvedValue({ execute }),
  }) as unknown as () => Promise<ActionsPluginStart>;

  registerPostToSlackRoute({ router, logger, getActions, http });
  const [config, handler] = router.post.mock.calls[0];
  return { config, handler, logger };
};

const callRoute = async (
  execute: jest.Mock,
  body: Record<string, unknown>,
  path = '/internal/adaptive_ui/share/slack'
) => {
  const { config, handler, logger } = registerRoute(execute);
  const response = httpServerMock.createResponseFactory();
  await handler({} as never, httpServerMock.createKibanaRequest({ body, path }), response);
  return { config, response, logger };
};

const okExecute = () =>
  jest.fn().mockResolvedValue({ status: 'ok', data: { ok: true, ts: '1.2' } });

describe('registerPostToSlackRoute', () => {
  beforeEach(() => jest.clearAllMocks());

  it('bounds the request body and opts out of authz with a reason', () => {
    const { config } = registerRoute(okExecute());

    expect(config.path).toBe(adaptiveUiApiPaths.postToSlack);
    expect(config.options?.body?.maxBytes).toBe(MAX_VIEW_SPEC_BYTES);
    expect(config.security?.authz).toEqual({
      enabled: false,
      reason: expect.stringContaining('actions client'),
    });
  });

  it('renders Block Kit and posts it through the connector', async () => {
    const execute = okExecute();
    const { response } = await callRoute(execute, {
      connectorId: 'conn-1',
      channel: 'C123',
      spec: validSpec,
    });

    const { actionId, params } = execute.mock.calls[0][0];
    expect(actionId).toBe('conn-1');
    expect(params.subAction).toBe('sendMessage');
    expect(params.subActionParams.channel).toBe('C123');
    expect(params.subActionParams.blocks.length).toBeGreaterThan(0);
    expect(response.ok).toHaveBeenCalledWith({ body: { ts: '1.2', blocks: expect.any(Number) } });
  });

  it('threads the post when threadTs is provided', async () => {
    const execute = okExecute();
    await callRoute(execute, {
      connectorId: 'conn-1',
      channel: 'C123',
      spec: validSpec,
      threadTs: '999.000',
    });

    expect(execute.mock.calls[0][0].params.subActionParams.threadTs).toBe('999.000');
  });

  it('absolutizes hrefs against the space-aware public URL', async () => {
    const execute = okExecute();
    await callRoute(
      execute,
      { connectorId: 'conn-1', channel: 'C123', spec: specWithHref },
      '/s/marketing/internal/adaptive_ui/share/slack'
    );

    expect(JSON.stringify(execute.mock.calls[0][0].params.subActionParams.blocks)).toContain(
      'https://kibana.example.com/s/marketing/app/security/cases/1'
    );
  });

  it('rejects a payload that is not a ViewSpec without reaching the connector', async () => {
    const execute = jest.fn();
    const { response } = await callRoute(execute, {
      connectorId: 'conn-1',
      channel: 'C123',
      spec: { nope: true },
    });

    expect(execute).not.toHaveBeenCalled();
    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: expect.stringContaining('Invalid ViewSpec') },
    });
  });

  it('surfaces a connector failure as a 502 naming the likely causes', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'error', message: 'channel_not_found' });
    const { response, logger } = await callRoute(execute, {
      connectorId: 'conn-1',
      channel: 'C123',
      spec: validSpec,
    });

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 502,
      body: { message: expect.stringContaining('channel_not_found') },
    });
    expect(logger.error).toHaveBeenCalled();
  });
});
