/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceStorage } from './storage';
import { WorkspaceClient } from './workspace_client';
import { WORKSPACE_SCHEMA_VERSION, type WorkspaceDocument } from '../types';

const createMockStorage = () => {
  const get = jest.fn();
  const index = jest.fn();
  const client = { get, index };
  const storage = {
    getClient: jest.fn().mockReturnValue(client),
  } as unknown as WorkspaceStorage;
  return { storage, get, index };
};

describe('WorkspaceClient', () => {
  describe('load', () => {
    it('returns the workspace snapshot when the document exists', async () => {
      const { storage, get } = createMockStorage();
      const files = {
        '/workspace/a.txt': {
          content: 'aGVsbG8=',
          mode: 0o644,
          mtime: '2025-01-01T00:00:00.000Z',
        },
      };
      const doc: WorkspaceDocument = {
        workspace_id: 'ws-1',
        schema_version: WORKSPACE_SCHEMA_VERSION,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        files,
      };
      get.mockResolvedValue({ _source: doc });
      const client = new WorkspaceClient({ storage });
      // load() returns the public snapshot shape (no schema_version/timestamps).
      expect(await client.load('ws-1')).toEqual({ files });
      expect(get).toHaveBeenCalledWith({ id: 'ws-1' });
    });

    it('returns undefined when the document is missing (404)', async () => {
      const { storage, get } = createMockStorage();
      get.mockRejectedValue({ statusCode: 404 });
      const client = new WorkspaceClient({ storage });
      expect(await client.load('missing')).toBeUndefined();
    });

    it('rethrows non-404 errors', async () => {
      const { storage, get } = createMockStorage();
      get.mockRejectedValue(new Error('boom'));
      const client = new WorkspaceClient({ storage });
      await expect(client.load('any')).rejects.toThrow(/boom/);
    });
  });

  describe('save', () => {
    it('upserts the workspace document with files and timestamps', async () => {
      const { storage, get, index } = createMockStorage();
      get.mockRejectedValue({ statusCode: 404 });
      const client = new WorkspaceClient({ storage });

      const files = {
        '/workspace/a.txt': {
          content: 'aGVsbG8=',
          mode: 0o644,
          mtime: '2025-01-01T00:00:00.000Z',
        },
      };
      await client.save('ws-2', files);

      expect(index).toHaveBeenCalledTimes(1);
      const arg = index.mock.calls[0][0];
      expect(arg.id).toBe('ws-2');
      expect(arg.document.workspace_id).toBe('ws-2');
      expect(arg.document.schema_version).toBe(WORKSPACE_SCHEMA_VERSION);
      expect(arg.document.files).toEqual(files);
      expect(typeof arg.document.updated_at).toBe('string');
      expect(typeof arg.document.created_at).toBe('string');
    });

    it('preserves created_at on subsequent saves', async () => {
      const { storage, get, index } = createMockStorage();
      const originalCreated = '2024-12-25T00:00:00.000Z';
      get.mockResolvedValue({
        _source: {
          workspace_id: 'ws-3',
          schema_version: WORKSPACE_SCHEMA_VERSION,
          created_at: originalCreated,
          updated_at: '2024-12-25T00:00:00.000Z',
          files: {},
        },
      });
      const client = new WorkspaceClient({ storage });

      await client.save('ws-3', {});

      const arg = index.mock.calls[0][0];
      expect(arg.document.created_at).toBe(originalCreated);
      expect(arg.document.updated_at).not.toBe(originalCreated);
    });
  });
});
