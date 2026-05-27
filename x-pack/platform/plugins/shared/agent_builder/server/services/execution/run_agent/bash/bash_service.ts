/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bash } from 'just-bash';
import type { FilesystemService } from '../../../filesystem/filesystem_service';
import type { IWorkspaceClient } from '../../../workspaces';
import {
  createExecToolCommand,
  type ExecToolFn,
  type ResolveToolIdFn,
} from './exec_tool_command';
import { truncateBashOutput } from './output_truncation';
import { ALLOWED_BASH_COMMANDS } from './allowed_commands';

export const DEFAULT_BASH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_BASH_CWD = '/tmp';

export const DEFAULT_EXECUTION_LIMITS = {
  maxCallDepth: 100,
  maxCommandCount: 10_000,
  maxLoopIterations: 10_000,
  maxAwkIterations: 10_000,
  maxSedIterations: 10_000,
};

/**
 * Compose multiple AbortSignals into one. Uses `AbortSignal.any` when available
 * (Node 20+), otherwise manually relays the first abort through a new controller.
 */
const anySignal = (signals: AbortSignal[]): AbortSignal => {
  const anyFn = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (typeof anyFn === 'function') return anyFn(signals);
  const controller = new AbortController();
  const onAbort = (event: Event) => {
    const target = event.target as AbortSignal;
    controller.abort(target.reason);
  };
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
};

export interface BashExecResult {
  stdout: string;
  stderr: string;
  exit_code: number;
  truncated?: boolean;
}

export interface BashServiceDeps {
  filesystemService: FilesystemService;
  workspaceClient?: IWorkspaceClient;
  execToolFn: ExecToolFn;
  resolveToolId: ResolveToolIdFn;
  abortSignal?: AbortSignal;
  timeoutMs?: number;
  /** Initial workspace_id from the conversation document (if any). */
  initialWorkspaceId?: string;
  /** Test-only override for the UUID generator. */
  getOrCreateWorkspaceIdHook?: () => string;
}

/**
 * Owns the just-bash runtime for a conversation run. Constructed only when
 * `experimentalFeatures.bash` is on. Holds the workspace id once bash has been
 * used at least once and flushes the workspace at end of round.
 */
export class BashService {
  private readonly deps: BashServiceDeps;
  private workspaceId?: string;
  private touched = false;

  constructor(deps: BashServiceDeps) {
    this.deps = deps;
    this.workspaceId = deps.initialWorkspaceId;
  }

  /**
   * Returns the existing workspace id if any, otherwise mints a new UUID and
   * remembers it. Subsequent calls return the same id.
   */
  getOrCreateWorkspaceId(existingId?: string): string {
    const provided = existingId ?? this.workspaceId;
    if (provided) {
      this.workspaceId = provided;
      return provided;
    }
    if (this.deps.getOrCreateWorkspaceIdHook) {
      this.workspaceId = this.deps.getOrCreateWorkspaceIdHook();
      return this.workspaceId;
    }
    this.workspaceId = uuidv4();
    return this.workspaceId;
  }

  /** Returns the workspace id if one has been minted/used in this run, else undefined. */
  getWorkspaceId(): string | undefined {
    return this.workspaceId;
  }

  async exec(command: string): Promise<BashExecResult> {
    // Mark touched on every exec. flush() runs unconditionally after that —
    // snapshotting an empty /workspace is cheap.
    this.touched = true;
    this.getOrCreateWorkspaceId();

    const fs = this.deps.filesystemService.getFilesystem();
    const execToolCommand = createExecToolCommand({
      execToolFn: this.deps.execToolFn,
      resolveToolId: this.deps.resolveToolId,
    });

    const bash = new Bash({
      fs,
      cwd: DEFAULT_BASH_CWD,
      executionLimits: DEFAULT_EXECUTION_LIMITS,
      commands: [...ALLOWED_BASH_COMMANDS],
      customCommands: [execToolCommand],
    });

    const timeoutMs = this.deps.timeoutMs ?? DEFAULT_BASH_TIMEOUT_MS;
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

    const signals: AbortSignal[] = [timeoutController.signal];
    if (this.deps.abortSignal) signals.push(this.deps.abortSignal);
    const combinedSignal = anySignal(signals);

    try {
      const result = await bash.exec(command, { signal: combinedSignal });
      // If the timeout fired, override the exit code regardless of what bash returned.
      if (timeoutController.signal.aborted) {
        return {
          stdout: '',
          stderr: `bash: timeout after ${timeoutMs}ms\n`,
          exit_code: 124,
        };
      }
      const { stdout, stderr, truncated } = truncateBashOutput(result.stdout, result.stderr);
      return {
        stdout,
        stderr,
        exit_code: result.exitCode,
        ...(truncated ? { truncated: true } : {}),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Persist the current /workspace contents to ES. No-op when bash was never
   * used in this run, when no workspace client is configured (standalone mode),
   * or when no workspace id has been minted. Also skips the ES write if the
   * workspace is empty and the document doesn't exist yet.
   */
  async flush(): Promise<void> {
    if (!this.touched) return;
    if (!this.workspaceId) return;
    if (!this.deps.workspaceClient) return;

    const files = await this.deps.filesystemService.snapshotWorkspaceFiles();
    if (Object.keys(files).length === 0) {
      const existing = await this.deps.workspaceClient.load(this.workspaceId);
      if (!existing) return;
    }
    await this.deps.workspaceClient.save(this.workspaceId, files);
  }
}
