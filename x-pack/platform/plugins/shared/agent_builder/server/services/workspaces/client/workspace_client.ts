/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceStorage } from './storage';
import type { WorkspaceDocument, WorkspaceFile } from '../types';

export interface IWorkspaceClient {
  load(workspaceId: string): Promise<WorkspaceDocument | undefined>;
  save(workspaceId: string, files: Record<string, WorkspaceFile>): Promise<void>;
}

export class WorkspaceClient implements IWorkspaceClient {
  private readonly storage: WorkspaceStorage;

  constructor({ storage }: { storage: WorkspaceStorage }) {
    this.storage = storage;
  }

  async load(workspaceId: string): Promise<WorkspaceDocument | undefined> {
    try {
      const response = await this.storage.getClient().get({ id: workspaceId });
      return response._source as WorkspaceDocument | undefined;
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) {
        return undefined;
      }
      throw err;
    }
  }

  async save(workspaceId: string, files: Record<string, WorkspaceFile>): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.load(workspaceId);
    const document: WorkspaceDocument = {
      workspace_id: workspaceId,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      files,
    };
    await this.storage.getClient().index({ id: workspaceId, document });
  }
}
