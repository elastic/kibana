/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceStorage } from './storage';
import {
  WORKSPACE_SCHEMA_VERSION,
  type WorkspaceDocument,
  type WorkspaceFile,
  type WorkspaceSnapshot,
} from '../types';

export interface IWorkspaceClient {
  load(workspaceId: string): Promise<WorkspaceSnapshot | undefined>;
  save(workspaceId: string, files: Record<string, WorkspaceFile>): Promise<void>;
}

export class WorkspaceClient implements IWorkspaceClient {
  private readonly storage: WorkspaceStorage;

  constructor({ storage }: { storage: WorkspaceStorage }) {
    this.storage = storage;
  }

  async load(workspaceId: string): Promise<WorkspaceSnapshot | undefined> {
    const doc = await this.loadDocument(workspaceId);
    if (!doc) return undefined;
    return { files: doc.files };
  }

  async save(workspaceId: string, files: Record<string, WorkspaceFile>): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.loadDocument(workspaceId);
    const document: WorkspaceDocument = {
      workspace_id: workspaceId,
      schema_version: WORKSPACE_SCHEMA_VERSION,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      files,
    };
    await this.storage.getClient().index({ id: workspaceId, document });
  }

  /** Internal — full document fetch including metadata. */
  private async loadDocument(workspaceId: string): Promise<WorkspaceDocument | undefined> {
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
}
