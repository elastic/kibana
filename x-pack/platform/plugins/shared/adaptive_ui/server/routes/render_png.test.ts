/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { MAX_VIEW_SPEC_BYTES, adaptiveUiApiPaths } from '../../common/http_api';
import { registerRenderPngRoute } from './render_png';

// The real rasterizer pulls in `satori` and native `@resvg/resvg-js`; these
// tests cover the route around it, not the pixels.
const mockRenderPNG = jest.fn();
jest.mock('@kbn/adaptive-ui/node', () => ({
  renderPNG: (...args: unknown[]) => mockRenderPNG(...args),
}));

const validSpec = {
  type: 'view',
  title: 'Open cases',
  body: [{ type: 'text', body: 'Two cases need triage.' }],
};

const registerRoute = () => {
  const router = httpServiceMock.createRouter();
  const logger = loggingSystemMock.createLogger();
  registerRenderPngRoute({ router, logger });
  const [config, handler] = router.post.mock.calls[0];
  return { config, handler, logger };
};

const callRoute = async (spec: unknown) => {
  const { config, handler, logger } = registerRoute();
  const response = httpServerMock.createResponseFactory();
  await handler({} as never, httpServerMock.createKibanaRequest({ body: { spec } }), response);
  return { config, response, logger };
};

describe('registerRenderPngRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderPNG.mockResolvedValue({ png: Buffer.from('fake-png') });
  });

  it('bounds the request body and opts out of authz with a reason', () => {
    const { config } = registerRoute();

    expect(config.path).toBe(adaptiveUiApiPaths.renderPng);
    expect(config.options?.body?.maxBytes).toBe(MAX_VIEW_SPEC_BYTES);
    expect(config.security?.authz).toEqual({
      enabled: false,
      reason: expect.stringContaining('ViewSpec'),
    });
  });

  it('returns the rendered PNG', async () => {
    const { response } = await callRoute(validSpec);

    expect(mockRenderPNG).toHaveBeenCalledWith(expect.objectContaining({ title: 'Open cases' }));
    expect(response.ok).toHaveBeenCalledWith({
      body: Buffer.from('fake-png'),
      headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
    });
  });

  it('rejects a payload that is not a ViewSpec without loading the rasterizer', async () => {
    const { response } = await callRoute({ nope: true });

    expect(mockRenderPNG).not.toHaveBeenCalled();
    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: expect.stringContaining('Invalid ViewSpec') },
    });
  });

  it('rejects a spec that fails semantic validation', async () => {
    const { response } = await callRoute({ type: 'view', title: 'No body' });

    expect(mockRenderPNG).not.toHaveBeenCalled();
    expect(response.badRequest).toHaveBeenCalled();
  });

  it('reports a rasterizer failure as a 500', async () => {
    mockRenderPNG.mockRejectedValue(new Error('resvg exploded'));

    const { response, logger } = await callRoute(validSpec);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Could not render this view as a PNG.' },
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('resvg exploded'));
  });
});
