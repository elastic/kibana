/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  Conversation,
  ConversationRound,
  VersionedAttachment,
} from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { registerAttachmentRoutes } from './attachments';
import type { RouteDependencies } from './types';

describe('Attachment Routes', () => {
  let mockRouter: jest.Mocked<IRouter>;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockConversationsClient: {
    get: jest.MockedFunction<(id: string) => Promise<Conversation>>;
    update: jest.MockedFunction<
      (params: { id: string; attachments: VersionedAttachment[] }) => Promise<void>
    >;
  };
  let mockGetInternalServices: jest.MockedFunction<
    () => {
      conversations: {
        getScopedClient: jest.MockedFunction<() => Promise<typeof mockConversationsClient>>;
      };
      attachments: {
        getTypeDefinition: jest.MockedFunction<(type: string) => any>;
      };
    }
  >;
  let mockResponse: {
    ok: jest.MockedFunction<(params?: any) => any>;
    badRequest: jest.MockedFunction<(params?: any) => any>;
    notFound: jest.MockedFunction<(params?: any) => any>;
    conflict: jest.MockedFunction<(params?: any) => any>;
    customError: jest.MockedFunction<(params?: any) => any>;
    forbidden: jest.MockedFunction<(params?: any) => any>;
  };
  let mockCoreSetup: {
    getStartServices: jest.MockedFunction<() => Promise<any[]>>;
  };
  let routeHandlers: Record<string, { config: any; handler: Function }>;

  const createMockAttachment = (
    overrides: Partial<VersionedAttachment> = {}
  ): VersionedAttachment => ({
    id: 'attachment-1',
    type: 'text',
    current_version: 1,
    versions: [
      {
        version: 1,
        data: 'test content',
        created_at: '2024-01-01T00:00:00.000Z',
        content_hash: 'abc123',
        estimated_tokens: 3,
      },
    ],
    description: 'Test attachment',
    active: true,
    ...overrides,
  });

  const createMockConversation = (
    attachments: VersionedAttachment[] = [],
    rounds: ConversationRound[] = []
  ): Conversation => ({
    id: 'conv-1',
    agent_id: 'agent-1',
    user: { id: 'user-1', username: 'Test User' },
    title: 'Test Conversation',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    rounds,
    attachments,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = loggingSystemMock.createLogger();

    mockConversationsClient = {
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };

    mockGetInternalServices = jest.fn().mockReturnValue({
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue(mockConversationsClient),
      },
      attachments: {
        getTypeDefinition: jest.fn().mockImplementation((type: string) => ({
          id: type,
          validate: (input: unknown) => ({ valid: true, data: input }),
          format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
        })),
      },
    });

    routeHandlers = {};

    const createVersionedRoute = (method: string) => ({
      addVersion: jest.fn().mockImplementation((config: any, handler: Function) => {
        return { addVersion: jest.fn() };
      }),
    });

    mockRouter = {
      versioned: {
        get: jest.fn().mockImplementation((config: any) => {
          const versionedRoute = createVersionedRoute('get');
          versionedRoute.addVersion = jest
            .fn()
            .mockImplementation((vConfig: any, handler: Function) => {
              routeHandlers[`GET:${config.path}`] = { config: vConfig, handler };
              return versionedRoute;
            });
          return versionedRoute;
        }),
        post: jest.fn().mockImplementation((config: any) => {
          const versionedRoute = createVersionedRoute('post');
          versionedRoute.addVersion = jest
            .fn()
            .mockImplementation((vConfig: any, handler: Function) => {
              routeHandlers[`POST:${config.path}`] = { config: vConfig, handler };
              return versionedRoute;
            });
          return versionedRoute;
        }),
        put: jest.fn().mockImplementation((config: any) => {
          const versionedRoute = createVersionedRoute('put');
          versionedRoute.addVersion = jest
            .fn()
            .mockImplementation((vConfig: any, handler: Function) => {
              routeHandlers[`PUT:${config.path}`] = { config: vConfig, handler };
              return versionedRoute;
            });
          return versionedRoute;
        }),
        delete: jest.fn().mockImplementation((config: any) => {
          const versionedRoute = createVersionedRoute('delete');
          versionedRoute.addVersion = jest
            .fn()
            .mockImplementation((vConfig: any, handler: Function) => {
              routeHandlers[`DELETE:${config.path}`] = { config: vConfig, handler };
              return versionedRoute;
            });
          return versionedRoute;
        }),
        patch: jest.fn().mockImplementation((config: any) => {
          const versionedRoute = createVersionedRoute('patch');
          versionedRoute.addVersion = jest
            .fn()
            .mockImplementation((vConfig: any, handler: Function) => {
              routeHandlers[`PATCH:${config.path}`] = { config: vConfig, handler };
              return versionedRoute;
            });
          return versionedRoute;
        }),
      },
    } as any;

    mockResponse = {
      ok: jest.fn((params) => ({ type: 'ok', ...params })),
      badRequest: jest.fn((params) => ({ type: 'badRequest', ...params })),
      notFound: jest.fn((params) => ({ type: 'notFound', ...params })),
      conflict: jest.fn((params) => ({ type: 'conflict', ...params })),
      customError: jest.fn((params) => ({ type: 'customError', ...params })),
      forbidden: jest.fn((params) => ({ type: 'forbidden', ...params })),
    };

    mockCoreSetup = {
      getStartServices: jest.fn().mockResolvedValue([
        {
          savedObjects: {
            getScopedClient: jest.fn().mockReturnValue({}),
          },
        },
      ]),
    };

    // Register routes
    registerAttachmentRoutes({
      router: mockRouter,
      getInternalServices: mockGetInternalServices,
      coreSetup: mockCoreSetup,
      logger: mockLogger,
    } as unknown as RouteDependencies);
  });

  const createMockContext = () => ({
    core: Promise.resolve({
      uiSettings: {
        client: {
          get: jest.fn().mockResolvedValue(true),
        },
      },
    }),
    licensing: Promise.resolve({
      license: {
        status: 'active',
        hasAtLeast: jest.fn().mockReturnValue(true),
      },
    }),
    agentBuilder: Promise.resolve({
      spaces: {
        getSpaceId: jest.fn().mockReturnValue('default'),
      },
    }),
  });

  const getHandler = (method: string, pathSuffix: string) => {
    const key = Object.keys(routeHandlers).find(
      (k) => k.startsWith(`${method}:`) && k.includes(pathSuffix)
    );
    if (!key) {
      throw new Error(`Handler not found for ${method} ${pathSuffix}`);
    }
    return routeHandlers[key].handler;
  };

  describe('GET /conversations/{conversation_id}/attachments', () => {
    const path = '/attachments';

    it('returns active attachments by default', async () => {
      const activeAttachment = createMockAttachment({ id: 'active-1', active: true });
      const deletedAttachment = createMockAttachment({ id: 'deleted-1', active: false });
      mockConversationsClient.get.mockResolvedValue(
        createMockConversation([activeAttachment, deletedAttachment])
      );

      const handler = getHandler('GET', path);
      const request = {
        params: { conversation_id: 'conv-1' },
        query: {},
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          results: expect.arrayContaining([expect.objectContaining({ id: 'active-1' })]),
          total_token_estimate: expect.any(Number),
        },
      });
      // Should only return active attachments
      const result = mockResponse.ok.mock.calls[0][0];
      expect(result.body.results).toHaveLength(1);
      expect(result.body.results[0].id).toBe('active-1');
    });

    it('returns deleted attachments when include_deleted=true', async () => {
      const activeAttachment = createMockAttachment({ id: 'active-1', active: true });
      const deletedAttachment = createMockAttachment({ id: 'deleted-1', active: false });
      mockConversationsClient.get.mockResolvedValue(
        createMockConversation([activeAttachment, deletedAttachment])
      );

      const handler = getHandler('GET', path);
      const request = {
        params: { conversation_id: 'conv-1' },
        query: { include_deleted: true },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const result = mockResponse.ok.mock.calls[0][0];
      expect(result.body.results).toHaveLength(2);
    });

    it('calculates total token estimate correctly', async () => {
      const attachment1 = createMockAttachment({
        id: 'a1',
        versions: [
          {
            version: 1,
            data: 'short',
            created_at: '2024-01-01',
            content_hash: 'a',
            estimated_tokens: 10,
          },
        ],
      });
      const attachment2 = createMockAttachment({
        id: 'a2',
        versions: [
          {
            version: 1,
            data: 'longer content',
            created_at: '2024-01-01',
            content_hash: 'b',
            estimated_tokens: 20,
          },
        ],
      });
      mockConversationsClient.get.mockResolvedValue(
        createMockConversation([attachment1, attachment2])
      );

      const handler = getHandler('GET', path);
      const request = {
        params: { conversation_id: 'conv-1' },
        query: {},
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const result = mockResponse.ok.mock.calls[0][0];
      expect(result.body.total_token_estimate).toBe(30);
    });

    it('returns empty array when conversation has no attachments', async () => {
      mockConversationsClient.get.mockResolvedValue(createMockConversation([]));

      const handler = getHandler('GET', path);
      const request = {
        params: { conversation_id: 'conv-1' },
        query: {},
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          results: [],
          total_token_estimate: 0,
        },
      });
    });
  });

  describe('POST /conversations/{conversation_id}/attachments', () => {
    const path = '/attachments';

    it('creates attachment with auto-generated ID', async () => {
      mockConversationsClient.get.mockResolvedValue(createMockConversation([]));

      const handler = getHandler('POST', path);
      const request = {
        params: { conversation_id: 'conv-1' },
        body: {
          type: 'text',
          data: 'new content',
          description: 'New attachment',
        },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const result = mockResponse.ok.mock.calls[0][0];
      expect(result.body.attachment).toMatchObject({
        type: 'text',
        description: 'New attachment',
        current_version: 1,
      });
      expect(result.body.attachment.id).toBeDefined();
      expect(mockConversationsClient.update).toHaveBeenCalled();
    });

    it('creates attachment with client-provided ID', async () => {
      mockConversationsClient.get.mockResolvedValue(createMockConversation([]));

      const handler = getHandler('POST', path);
      const request = {
        params: { conversation_id: 'conv-1' },
        body: {
          id: 'custom-id',
          type: 'json',
          data: { key: 'value' },
          description: 'JSON attachment',
        },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const result = mockResponse.ok.mock.calls[0][0];
      expect(result.body.attachment.id).toBe('custom-id');
    });

    it('returns 409 for duplicate ID', async () => {
      const existingAttachment = createMockAttachment({ id: 'existing-id' });
      mockConversationsClient.get.mockResolvedValue(createMockConversation([existingAttachment]));

      const handler = getHandler('POST', path);
      const request = {
        params: { conversation_id: 'conv-1' },
        body: {
          id: 'existing-id',
          type: 'text',
          data: 'new content',
        },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.conflict).toHaveBeenCalledWith({
        body: { message: "Attachment with ID 'existing-id' already exists" },
      });
    });

    it('creates attachment with hidden flag', async () => {
      mockConversationsClient.get.mockResolvedValue(createMockConversation([]));

      const handler = getHandler('POST', path);
      const request = {
        params: { conversation_id: 'conv-1' },
        body: {
          type: 'text',
          data: 'hidden content',
          hidden: true,
        },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const result = mockResponse.ok.mock.calls[0][0];
      expect(result.body.attachment.hidden).toBe(true);
    });
  });

  describe('PUT /conversations/{conversation_id}/attachments/{attachment_id}', () => {
    const path = '/attachments/{attachment_id}';

    it('creates new version with updated data', async () => {
      const existingAttachment = createMockAttachment({ id: 'att-1' });
      mockConversationsClient.get.mockResolvedValue(createMockConversation([existingAttachment]));

      const handler = getHandler('PUT', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
        body: {
          data: 'updated content',
        },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const result = mockResponse.ok.mock.calls[0][0];
      expect(result.body.attachment.current_version).toBe(2);
      expect(result.body.new_version).toBe(2);
    });

    it('updates description', async () => {
      const existingAttachment = createMockAttachment({
        id: 'att-1',
        description: 'Old description',
      });
      mockConversationsClient.get.mockResolvedValue(createMockConversation([existingAttachment]));

      const handler = getHandler('PUT', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
        body: {
          data: 'content',
          description: 'New description',
        },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const result = mockResponse.ok.mock.calls[0][0];
      expect(result.body.attachment.description).toBe('New description');
    });

    it('returns 404 for non-existent attachment', async () => {
      mockConversationsClient.get.mockResolvedValue(createMockConversation([]));

      const handler = getHandler('PUT', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'non-existent' },
        body: {
          data: 'updated content',
        },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: { message: "Attachment 'non-existent' not found" },
      });
    });

    it('returns error for deleted attachment', async () => {
      const deletedAttachment = createMockAttachment({ id: 'att-1', active: false });
      mockConversationsClient.get.mockResolvedValue(createMockConversation([deletedAttachment]));

      const handler = getHandler('PUT', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
        body: {
          data: 'updated content',
        },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: { message: "Cannot update deleted attachment 'att-1'. Restore it first." },
      });
    });
  });

  describe('DELETE /conversations/{conversation_id}/attachments/{attachment_id}', () => {
    const path = '/attachments/{attachment_id}';

    it('soft deletes attachment by default', async () => {
      const attachment = createMockAttachment({ id: 'att-1', active: true });
      mockConversationsClient.get.mockResolvedValue(createMockConversation([attachment]));

      const handler = getHandler('DELETE', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
        query: {},
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          permanent: false,
        },
      });
      expect(mockConversationsClient.update).toHaveBeenCalled();
    });

    it('permanently deletes unreferenced attachment when permanent=true', async () => {
      const attachment = createMockAttachment({ id: 'att-1', active: true });
      mockConversationsClient.get.mockResolvedValue(createMockConversation([attachment], []));

      const handler = getHandler('DELETE', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
        query: { permanent: true },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          permanent: true,
        },
      });
    });

    it('blocks permanent delete for referenced attachments', async () => {
      const attachment = createMockAttachment({ id: 'att-1' });
      const roundWithReference: ConversationRound = {
        id: 'round-1',
        status: ConversationRoundStatus.completed,
        input: { message: 'test' },
        steps: [
          {
            type: ConversationRoundStepType.toolCall,
            tool_call_id: 'tc-1',
            tool_id: 'platform.core.attachment_read',
            params: { attachment_id: 'att-1' },
            results: [
              {
                tool_result_id: 'result-1',
                type: ToolResultType.other,
                data: { type: 'text', data: 'test content' },
              },
            ],
          },
        ],
        response: { message: 'response' },
        started_at: '2024-01-01T00:00:00.000Z',
        time_to_first_token: 100,
        time_to_last_token: 500,
        model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 10, output_tokens: 20 },
      };
      mockConversationsClient.get.mockResolvedValue(
        createMockConversation([attachment], [roundWithReference])
      );

      const handler = getHandler('DELETE', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
        query: { permanent: true },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.conflict).toHaveBeenCalledWith({
        body: {
          message:
            "Cannot permanently delete attachment 'att-1' because it is referenced in conversation rounds",
        },
      });
    });

    it('blocks permanent delete for attachments with client_id', async () => {
      const attachment = createMockAttachment({
        id: 'att-1',
        versions: [
          {
            version: 1,
            data: { client_id: 'flyout-config-123' },
            created_at: '2024-01-01',
            content_hash: 'abc',
            estimated_tokens: 5,
          },
        ],
      });
      mockConversationsClient.get.mockResolvedValue(createMockConversation([attachment], []));

      const handler = getHandler('DELETE', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
        query: { permanent: true },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.conflict).toHaveBeenCalledWith({
        body: {
          message:
            "Cannot permanently delete attachment 'att-1' because it was created from flyout configuration",
        },
      });
    });

    it('blocks all deletes for screen context attachments', async () => {
      const screenContextAttachment = createMockAttachment({
        id: 'att-1',
        type: 'screen_context',
      });
      mockConversationsClient.get.mockResolvedValue(
        createMockConversation([screenContextAttachment])
      );

      const handler = getHandler('DELETE', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
        query: {},
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: { message: 'Screen context attachments cannot be deleted' },
      });
    });

    it('returns 404 for non-existent attachment', async () => {
      mockConversationsClient.get.mockResolvedValue(createMockConversation([]));

      const handler = getHandler('DELETE', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'non-existent' },
        query: {},
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: { message: "Attachment 'non-existent' not found" },
      });
    });

    it('returns error when soft deleting already deleted attachment', async () => {
      const deletedAttachment = createMockAttachment({ id: 'att-1', active: false });
      mockConversationsClient.get.mockResolvedValue(createMockConversation([deletedAttachment]));

      const handler = getHandler('DELETE', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
        query: {},
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: { message: "Attachment 'att-1' is already deleted" },
      });
    });
  });

  describe('POST /conversations/{conversation_id}/attachments/{attachment_id}/_restore', () => {
    const path = '/_restore';

    it('restores soft-deleted attachment', async () => {
      const deletedAttachment = createMockAttachment({ id: 'att-1', active: false });
      mockConversationsClient.get.mockResolvedValue(createMockConversation([deletedAttachment]));

      const handler = getHandler('POST', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const result = mockResponse.ok.mock.calls[0][0];
      expect(result.body.success).toBe(true);
      expect(result.body.attachment).toBeDefined();
    });

    it('returns 404 for non-existent attachment', async () => {
      mockConversationsClient.get.mockResolvedValue(createMockConversation([]));

      const handler = getHandler('POST', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'non-existent' },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: { message: "Attachment 'non-existent' not found" },
      });
    });

    it('returns error if attachment not deleted', async () => {
      const activeAttachment = createMockAttachment({ id: 'att-1', active: true });
      mockConversationsClient.get.mockResolvedValue(createMockConversation([activeAttachment]));

      const handler = getHandler('POST', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: { message: "Attachment 'att-1' is not deleted" },
      });
    });
  });

  describe('PATCH /conversations/{conversation_id}/attachments/{attachment_id}', () => {
    const path = '/attachments/{attachment_id}';

    it('renames attachment without creating new version', async () => {
      const attachment = createMockAttachment({
        id: 'att-1',
        description: 'Old name',
        current_version: 1,
      });
      mockConversationsClient.get.mockResolvedValue(createMockConversation([attachment]));

      const handler = getHandler('PATCH', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'att-1' },
        body: { description: 'New name' },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalled();
      const result = mockResponse.ok.mock.calls[0][0];
      expect(result.body.success).toBe(true);
      expect(result.body.attachment.description).toBe('New name');
      // Version should not change
      expect(result.body.attachment.current_version).toBe(1);
    });

    it('returns 404 for non-existent attachment', async () => {
      mockConversationsClient.get.mockResolvedValue(createMockConversation([]));

      const handler = getHandler('PATCH', path);
      const request = {
        params: { conversation_id: 'conv-1', attachment_id: 'non-existent' },
        body: { description: 'New name' },
      };

      await handler(createMockContext(), request, mockResponse);

      expect(mockResponse.notFound).toHaveBeenCalledWith({
        body: { message: "Attachment 'non-existent' not found" },
      });
    });
  });
});
