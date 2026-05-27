/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public contract for the agent's unified virtual filesystem service.
 *
 * Concrete implementation lives in the agent_builder plugin
 * (`services/filesystem/filesystem_service.ts`); this interface keeps the
 * contract reachable from the agent-builder-server package so it can appear
 * on `AgentHandlerContext`.
 */
export interface IFilesystemService {
  /**
   * Returns the unified `IFileSystem` shared between `read_file` and `bash`.
   * The result is the just-bash `IFileSystem` contract; we keep it untyped
   * here to avoid pulling just-bash types into the public agent-builder API.
   */
  getFilesystem(): unknown;

  /**
   * Snapshot the contents of `/workspace` for persistence to ES.
   */
  snapshotWorkspaceFiles(): Promise<
    Record<string, { content: string; mode: number; mtime: string }>
  >;
}
