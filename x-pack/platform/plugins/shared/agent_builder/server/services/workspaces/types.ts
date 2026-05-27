/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Persistent representation of a single file in a workspace.
 * Content is base64-encoded so binary data round-trips safely.
 */
export interface WorkspaceFile {
  content: string; // base64-encoded bytes
  mode: number;
  mtime: string; // ISO 8601
}

/**
 * A workspace document persisted in `chatSystemIndex('workspaces')`.
 * `files` keys are absolute paths within `/workspace` (e.g. `/workspace/notes.txt`).
 */
export interface WorkspaceDocument {
  workspace_id: string;
  created_at: string;
  updated_at: string;
  files: Record<string, WorkspaceFile>;
}
