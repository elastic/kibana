/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { apiPrivileges } from '../../common/features';
import { smlCrawlerPath } from '../../common/constants';
import {
  SML_CRAWLER_GRANT_SAVED_OBJECT_TYPE,
  buildSmlCrawlerGrantId,
} from '../saved_objects/sml_crawler_grant';
import { registerCrawlerRoute } from './crawler';

const createMockSmlService = () => ({
  getTypeDefinition: jest.fn(),
  getCrawler: jest.fn().mockReturnValue({
    crawl: jest.fn().mockResolvedValue(undefined),
  }),
});

const createMockUiSettingsClient = (enabled = true) => ({
  get: jest.fn().mockImplementation(async (key: string) => {
    if (key === AGENT_CONTEXT_LAYER_EXPERIMENTAL_FEATURES_SETTING_ID) return enabled;
    return undefined;
  }),
});

describe('registerCrawlerRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockSmlService: ReturnType<typeof createMockSmlService>;
  const logger = loggingSystemMock.create().get();
  let internalSo: {
    create: jest.Mock;
    delete: jest.Mock;
    get: jest.Mock;
  };
  let coreSetup: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockSmlService = createMockSmlService();
    internalSo = {
      create: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      get: jest.fn(),
    };

    coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asInternalUser: { internal: true },
            asCurrentUser: {},
          },
        },
        savedObjects: {
          createInternalRepository: jest.fn().mockReturnValue(internalSo),
          getScopedClient: jest.fn().mockReturnValue({ scoped: true }),
        },
      },
      {
        security: {
          authc: {
            getCurrentUser: jest.fn().mockReturnValue({ username: 'jdoe' }),
          },
        },
      },
      {},
    ]);

    registerCrawlerRoute({
      router: router as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, registeredHandler] = router.post.mock.calls.find((c) => c[0].path === smlCrawlerPath)!;
    handler = registeredHandler;
  });

  const callHandler = async (
    body: Record<string, unknown>,
    uiSettingsEnabled = true,
    authz?: Record<string, boolean>
  ) => {
    const request = httpServerMock.createKibanaRequest({ body, method: 'post' });
    (request as unknown as { authzResult: Record<string, boolean> }).authzResult = authz ?? {
      [apiPrivileges.manageSmlCrawler]: true,
      [apiPrivileges.readAgentContextLayer]: true,
    };
    const response = httpServerMock.createResponseFactory();
    const mockUiSettings = createMockUiSettingsClient(uiSettingsEnabled);
    const ctx = {
      core: Promise.resolve({
        uiSettings: { client: mockUiSettings },
        elasticsearch: {
          client: {
            asCurrentUser: { userEs: true },
          },
        },
      }),
    };
    await handler(ctx, request, response);
    return response;
  };

  it('returns 404 when experimental flag is off', async () => {
    const response = await callHandler(
      { action: 'grant', attachment_type: 'lens', username: 'u' },
      false
    );
    expect(response.notFound).toHaveBeenCalled();
    expect(internalSo.create).not.toHaveBeenCalled();
  });

  it('grant: 403 without manage privilege', async () => {
    const response = await callHandler(
      { action: 'grant', attachment_type: 'lens', username: 'u' },
      true,
      { [apiPrivileges.readAgentContextLayer]: true }
    );
    expect(response.forbidden).toHaveBeenCalled();
    expect(internalSo.create).not.toHaveBeenCalled();
  });

  it('grant: 400 for unknown type', async () => {
    mockSmlService.getTypeDefinition.mockReturnValue(undefined);
    const response = await callHandler({
      action: 'grant',
      attachment_type: 'unknown',
      username: 'u',
    });
    expect(response.badRequest).toHaveBeenCalled();
  });

  it('grant: creates hidden saved object', async () => {
    mockSmlService.getTypeDefinition.mockReturnValue({ id: 'lens' } as any);
    const response = await callHandler({
      action: 'grant',
      attachment_type: 'lens',
      username: 'jdoe',
    });
    expect(response.ok).toHaveBeenCalled();
    expect(internalSo.create).toHaveBeenCalledWith(
      SML_CRAWLER_GRANT_SAVED_OBJECT_TYPE,
      { username: 'jdoe', attachment_type: 'lens' },
      { id: buildSmlCrawlerGrantId('jdoe', 'lens'), overwrite: true }
    );
  });

  it('revoke: 404 when grant missing', async () => {
    mockSmlService.getTypeDefinition.mockReturnValue({ id: 'lens' } as any);
    internalSo.delete.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());
    const response = await callHandler({
      action: 'revoke',
      attachment_type: 'lens',
      username: 'jdoe',
    });
    expect(response.notFound).toHaveBeenCalled();
  });

  it('run: 403 without grant', async () => {
    mockSmlService.getTypeDefinition.mockReturnValue({ id: 'lens' } as any);
    internalSo.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());
    const response = await callHandler({ action: 'run', attachment_type: 'lens' }, true, {
      [apiPrivileges.readAgentContextLayer]: true,
    });
    expect(response.forbidden).toHaveBeenCalled();
    expect(mockSmlService.getCrawler().crawl).not.toHaveBeenCalled();
  });

  it('run: invokes crawl with userScope when grant exists', async () => {
    mockSmlService.getTypeDefinition.mockReturnValue({ id: 'lens', list: jest.fn() } as any);
    internalSo.get.mockResolvedValue({ id: 'x', attributes: {} });
    const crawl = mockSmlService.getCrawler().crawl as jest.Mock;

    const response = await callHandler({ action: 'run', attachment_type: 'lens' }, true, {
      [apiPrivileges.readAgentContextLayer]: true,
    });

    expect(response.ok).toHaveBeenCalled();
    expect(crawl).toHaveBeenCalledWith(
      expect.objectContaining({
        definition: expect.objectContaining({ id: 'lens' }),
        esClient: { internal: true },
        userScope: {
          elasticsearchClient: { userEs: true },
          savedObjectsClient: { scoped: true },
        },
      })
    );
  });
});
