/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { publicApiPath } from '../../../common/constants';

export interface MemoryEntry {
  id: string;
  path: string;
  title: string;
  content: string;
  parent_path: string;
  space: string;
  version: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface MemoryTreeNode {
  path: string;
  title: string;
  id?: string;
  has_children: boolean;
  children: MemoryTreeNode[];
}

export interface MemorySearchResult {
  id: string;
  path: string;
  title: string;
  snippet: string;
  score: number;
  updated_at: string;
  updated_by: string;
  tags: string[];
}

export interface MemoryVersionRecord {
  id: string;
  entry_id: string;
  version: number;
  path: string;
  title: string;
  content: string;
  change_type: 'create' | 'update' | 'delete' | 'move';
  change_summary: string;
  space: string;
  created_at: string;
  created_by: string;
}

export interface CompactionLogEntry {
  id: string;
  operation: string;
  affected_entries: string[];
  summary: string;
  space: string;
  created_at: string;
  created_by: string;
  source_conversation_id?: string;
}

const memoryPath = `${publicApiPath}/memory`;

export class MemoryService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async createEntry(params: {
    path: string;
    title: string;
    content: string;
    tags?: string[];
  }): Promise<MemoryEntry> {
    return this.http.post<MemoryEntry>(`${memoryPath}/entries`, {
      body: JSON.stringify(params),
    });
  }

  async getEntry(id: string): Promise<MemoryEntry> {
    return this.http.get<MemoryEntry>(`${memoryPath}/entries/${id}`);
  }

  async getEntryByPath(path: string): Promise<MemoryEntry | undefined> {
    try {
      return await this.http.get<MemoryEntry>(`${memoryPath}/entries/by-path`, {
        query: { path },
      });
    } catch {
      return undefined;
    }
  }

  async updateEntry(
    id: string,
    params: {
      title?: string;
      content?: string;
      tags?: string[];
      path?: string;
      change_summary?: string;
    }
  ): Promise<MemoryEntry> {
    return this.http.put<MemoryEntry>(`${memoryPath}/entries/${id}`, {
      body: JSON.stringify(params),
    });
  }

  async deleteEntry(id: string): Promise<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${memoryPath}/entries/${id}`);
  }

  async moveEntry(id: string, newPath: string): Promise<MemoryEntry> {
    return this.http.post<MemoryEntry>(`${memoryPath}/entries/${id}/move`, {
      body: JSON.stringify({ new_path: newPath }),
    });
  }

  async search(params: {
    query: string;
    tags?: string[];
    parent_path?: string;
    size?: number;
  }): Promise<{ results: MemorySearchResult[] }> {
    return this.http.post<{ results: MemorySearchResult[] }>(`${memoryPath}/search`, {
      body: JSON.stringify(params),
    });
  }

  async getTree(): Promise<{ tree: MemoryTreeNode[] }> {
    return this.http.get<{ tree: MemoryTreeNode[] }>(`${memoryPath}/tree`);
  }

  async getHistory(entryId: string, size?: number): Promise<{ history: MemoryVersionRecord[] }> {
    return this.http.get<{ history: MemoryVersionRecord[] }>(
      `${memoryPath}/entries/${entryId}/history`,
      { query: size ? { size } : undefined }
    );
  }

  async getVersion(entryId: string, version: number): Promise<MemoryVersionRecord> {
    return this.http.get<MemoryVersionRecord>(
      `${memoryPath}/entries/${entryId}/history/${version}`
    );
  }

  async rollback(entryId: string, version: number): Promise<MemoryEntry> {
    return this.http.post<MemoryEntry>(`${memoryPath}/entries/${entryId}/rollback`, {
      body: JSON.stringify({ version }),
    });
  }

  async getCompactionLog(size?: number): Promise<{ log: CompactionLogEntry[] }> {
    return this.http.get<{ log: CompactionLogEntry[] }>(`${memoryPath}/compaction-log`, {
      query: size ? { size } : undefined,
    });
  }
}
