/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
