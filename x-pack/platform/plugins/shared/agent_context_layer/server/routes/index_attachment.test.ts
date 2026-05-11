/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { registerIndexAttachmentRoute } from './index_attachment';

const createMockSmlService = () => ({
  search: jest.fn(),
  checkItemsAccess: jest.fn(),
  indexAttachment: jest.fn().mockResolvedValue(undefined),
  getDocuments: jest.fn(),
  // Default: treat any type as registered. Individual tests can override.
  getTypeDefinition: jest.fn().mockImplementation((id: string) => ({ id })),
  listTypeDefinitions: jest.fn(),
  getCrawler: jest.fn(),
});

const createMockUiSettingsClient = (enabled = true) => ({
  get: jest.fn().mockImplementation(async (key: string) => {
    if (key === AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID) return enabled;
    return undefined;
  }),
});

describe('registerIndexAttachmentRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let validate: any;
  let mockSmlService: ReturnType<typeof createMockSmlService>;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    mockSmlService = createMockSmlService();
    const coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([
      {},
      { spaces: { spacesService: { getSpaceId: jest.fn().mockReturnValue('test-space') } } },
      {},
    ]);
    router = httpServiceMock.createRouter();
    registerIndexAttachmentRoute({
      router: router as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });
    const [config, registeredHandler] = router.post.mock.calls[0];
    handler = registeredHandler;
    validate = config.validate;
  });

  const validateBody = (body: Record<string, unknown>) => {
    if (!validate || typeof validate === 'function' || !validate.body) return body;
    return validate.body.validate(body);
  };

  const callHandler = async (body: Record<string, unknown>, uiSettingsEnabled = true) => {
    const request = httpServerMock.createKibanaRequest({ body: validateBody(body) });
    const response = httpServerMock.createResponseFactory();
    const ctx = {
      core: Promise.resolve({
        uiSettings: { client: createMockUiSettingsClient(uiSettingsEnabled) },
        elasticsearch: { client: { asInternalUser: { mark: 'internal' }, asCurrentUser: {} } },
        savedObjects: { client: { mark: 'so-client' } },
      }),
    };
    await handler(ctx, request, response);
    return response;
  };

  it('registers a POST route at the expected path with internal access', () => {
    const [config] = router.post.mock.calls[0];
    expect(config.path).toBe('/internal/agent_context_layer/sml/_index');
    expect(config.options).toEqual({ access: 'internal' });
  });

  describe('schema validation', () => {
    it('rejects create requests without chunks', () => {
      expect(() =>
        validateBody({
          origin_id: 'viz-1',
          attachment_type: 'visualization',
          action: 'create',
        })
      ).toThrow();
    });

    it('rejects create requests with an empty chunks array', () => {
      expect(() =>
        validateBody({
          origin_id: 'viz-1',
          attachment_type: 'visualization',
          action: 'create',
          chunks: [],
        })
      ).toThrow();
    });

    it('rejects delete requests that include chunks', () => {
      expect(() =>
        validateBody({
          origin_id: 'viz-1',
          attachment_type: 'visualization',
          action: 'delete',
          chunks: [{ type: 'visualization', title: 't', content: 'c' }],
        })
      ).toThrow();
    });

    it('accepts a well-formed create request', () => {
      expect(() =>
        validateBody({
          origin_id: 'viz-1',
          attachment_type: 'visualization',
          action: 'create',
          chunks: [{ type: 'visualization', title: 't', content: 'c' }],
        })
      ).not.toThrow();
    });
  });

  it('returns 400 when the attachment_type is not registered', async () => {
    mockSmlService.getTypeDefinition.mockReturnValueOnce(undefined);
    const response = await callHandler({
      origin_id: 'viz-1',
      attachment_type: 'unknown',
      action: 'create',
      chunks: [{ type: 'unknown', title: 't', content: 'c' }],
    });
    expect(response.badRequest).toHaveBeenCalledWith({
      body: `Unknown SML attachment type: 'unknown'`,
    });
    expect(mockSmlService.indexAttachment).not.toHaveBeenCalled();
  });

  it('returns 400 when the attachment_type is not registered for delete', async () => {
    mockSmlService.getTypeDefinition.mockReturnValueOnce(undefined);
    const response = await callHandler({
      origin_id: 'viz-1',
      attachment_type: 'unknown',
      action: 'delete',
    });
    expect(response.badRequest).toHaveBeenCalledWith({
      body: `Unknown SML attachment type: 'unknown'`,
    });
    expect(mockSmlService.indexAttachment).not.toHaveBeenCalled();
  });

  it('returns 404 when the experimental feature flag is disabled', async () => {
    const response = await callHandler(
      {
        origin_id: 'viz-1',
        attachment_type: 'visualization',
        action: 'create',
        chunks: [{ type: 'visualization', title: 't', content: 'c' }],
      },
      false
    );
    expect(response.notFound).toHaveBeenCalled();
    expect(mockSmlService.indexAttachment).not.toHaveBeenCalled();
  });

  it('passes caller-supplied chunks through to the service for registered types', async () => {
    const response = await callHandler({
      origin_id: 'viz-1',
      attachment_type: 'custom',
      action: 'create',
      chunks: [{ type: 'custom', title: 'My title', content: 'My content', description: 'd' }],
    });

    expect(mockSmlService.getTypeDefinition).toHaveBeenCalledWith('custom');
    expect(mockSmlService.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        originId: 'viz-1',
        attachmentType: 'custom',
        action: 'create',
        spaces: ['test-space'],
        esClient: expect.objectContaining({ mark: 'internal' }),
        savedObjectsClient: expect.objectContaining({ mark: 'so-client' }),
        chunks: [
          {
            type: 'custom',
            title: 'My title',
            content: 'My content',
            description: 'd',
          },
        ],
        // HTTP route is always a "direct" write — overrides any crawler chunks.
        source: 'direct',
      })
    );
    expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true } });
  });

  it('omits optional chunk fields when not provided', async () => {
    await callHandler({
      origin_id: 'viz-1',
      attachment_type: 'visualization',
      action: 'update',
      chunks: [{ type: 'visualization', title: 't', content: 'c' }],
    });
    const callArgs = mockSmlService.indexAttachment.mock.calls[0][0];
    expect(callArgs.chunks[0]).toEqual({ type: 'visualization', title: 't', content: 'c' });
    expect(Object.keys(callArgs.chunks[0])).toEqual(['type', 'title', 'content']);
  });

  it('handles the delete action without chunks', async () => {
    const response = await callHandler({
      origin_id: 'viz-1',
      attachment_type: 'visualization',
      action: 'delete',
    });
    expect(mockSmlService.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'delete',
        originId: 'viz-1',
        // HTTP-driven deletes are direct: they wipe everything for the origin.
        source: 'direct',
      })
    );
    // No `chunks` should be sent to the service for delete.
    expect(mockSmlService.indexAttachment.mock.calls[0][0].chunks).toBeUndefined();
    expect(response.ok).toHaveBeenCalledWith({ body: { acknowledged: true } });
  });

  it('falls back to default space when the spaces plugin is unavailable', async () => {
    const localSml = createMockSmlService();
    const coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([{}, {}, {}]);
    const localRouter = httpServiceMock.createRouter();
    registerIndexAttachmentRoute({
      router: localRouter as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => localSml as any,
    });
    const [config, localHandler] = localRouter.post.mock.calls[0];

    const body = (config.validate as any).body.validate({
      origin_id: 'viz-1',
      attachment_type: 'visualization',
      action: 'create',
      chunks: [{ type: 'visualization', title: 't', content: 'c' }],
    });
    const request = httpServerMock.createKibanaRequest({ body });
    const response = httpServerMock.createResponseFactory();
    const ctx = {
      core: Promise.resolve({
        uiSettings: { client: createMockUiSettingsClient(true) },
        elasticsearch: { client: { asInternalUser: {}, asCurrentUser: {} } },
        savedObjects: { client: {} },
      }),
    };

    await localHandler(ctx, request, response);
    expect(localSml.indexAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ spaces: ['default'] })
    );
  });

  it('propagates errors from sml.indexAttachment', async () => {
    mockSmlService.indexAttachment.mockRejectedValueOnce(new Error('ES write failed'));
    await expect(
      callHandler({
        origin_id: 'viz-1',
        attachment_type: 'visualization',
        action: 'create',
        chunks: [{ type: 'visualization', title: 't', content: 'c' }],
      })
    ).rejects.toThrow('ES write failed');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES write failed'));
  });
});
