/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  httpServerMock,
} from '@kbn/core/server/mocks';
import { createConversationNotFoundError } from '@kbn/agent-builder-common';
import { WorkspaceClient } from './client/workspace_client';
import { createWorkspaceService } from './workspace_service';

// Keep the real path validation; stub the ES-backed workspace client + storage.
jest.mock('./client/workspace_client');
jest.mock('./client/storage', () => ({ createStorage: jest.fn(() => ({})) }));

const b64 = (s: string) => Buffer.from(s).toString('base64');

describe('WorkspaceService', () => {
  let mockGet: jest.Mock;
  let mockLoad: jest.Mock;

  const buildService = () => {
    mockGet = jest.fn().mockResolvedValue({ id: 'conv-1', workspace_id: 'ws-1' });
    mockLoad = jest.fn().mockResolvedValue({
      files: {
        '/workspace/renders/table/x.json': {
          content: b64('{"hello":"world"}'),
          mode: 0o644,
          mtime: '',
        },
      },
    });
    (WorkspaceClient as unknown as jest.Mock).mockImplementation(() => ({ load: mockLoad }));

    const conversations = {
      getScopedClient: jest.fn().mockResolvedValue({ get: mockGet }),
    } as any;

    return createWorkspaceService({
      logger: loggingSystemMock.createLogger(),
      elasticsearch: elasticsearchServiceMock.createStart(),
      spaces: undefined,
      conversations,
    });
  };

  const readFile = async (path: string) => {
    const service = buildService();
    const client = await service.getScopedClient({ request: httpServerMock.createKibanaRequest() });
    return client.readFile({ conversationId: 'conv-1', path });
  };

  beforeEach(() => jest.clearAllMocks());

  it('reads and decodes a file within /workspace', async () => {
    const result = await readFile('/workspace/renders/table/x.json');
    expect(result).toEqual({
      path: '/workspace/renders/table/x.json',
      content: '{"hello":"world"}',
    });
  });

  it('throws BadRequest for a path outside /workspace', async () => {
    await expect(readFile('/workspace/../etc/passwd')).rejects.toThrow('within /workspace');
    // The conversation must not be loaded when the path is invalid.
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns undefined when the conversation has no workspace', async () => {
    const service = buildService();
    mockGet.mockResolvedValueOnce({ id: 'conv-1' });
    const client = await service.getScopedClient({ request: httpServerMock.createKibanaRequest() });
    await expect(
      client.readFile({ conversationId: 'conv-1', path: '/workspace/renders/table/x.json' })
    ).resolves.toBeUndefined();
  });

  it('returns undefined when the file is missing', async () => {
    const service = buildService();
    mockLoad.mockResolvedValueOnce({ files: {} });
    const client = await service.getScopedClient({ request: httpServerMock.createKibanaRequest() });
    await expect(
      client.readFile({ conversationId: 'conv-1', path: '/workspace/renders/table/missing.json' })
    ).resolves.toBeUndefined();
  });

  it('propagates conversation not-found (no access)', async () => {
    const service = buildService();
    mockGet.mockRejectedValueOnce(createConversationNotFoundError({ conversationId: 'conv-1' }));
    const client = await service.getScopedClient({ request: httpServerMock.createKibanaRequest() });
    await expect(
      client.readFile({ conversationId: 'conv-1', path: '/workspace/renders/table/x.json' })
    ).rejects.toThrow();
  });
});
