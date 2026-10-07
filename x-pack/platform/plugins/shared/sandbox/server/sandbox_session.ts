/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  SandboxApiClient,
  RunCommandParams,
  RunCommandResult,
  FileMetadata,
  ReadFileResult,
  WriteFileResult,
} from './grpc_client';

/**
 * A per-session handle to a gVisor sandbox pod.
 *
 * Each session is scoped to a `(spaceId, sessionId)` pair and proxies RPCs
 * to a single pod via the sandbox-api gRPC service. Obtain a session from
 * {@link SandboxPluginStart.getSession} — the plugin manages session lifecycle
 * and pod allocation transparently.
 *
 * **Pod eviction and `isReset`**
 *
 * Pods can be evicted at any time (OOM, node pressure, deploy). When a call
 * fails with gRPC status `UNAVAILABLE` (code 14) the session treats that as a
 * pod eviction: `isReset` flips to `true` and the error is re-thrown so callers
 * can react (e.g. surface a retry hint). After the next successful call
 * `isReset` returns to `false`.
 *
 * Callers that need to seed a fresh pod (write config files, restore state)
 * should check `isReset` before each invocation and perform setup when it is
 * `true`. The check-then-setup pattern is inherently best-effort: a pod eviction
 * that occurs between the check and the setup call will be caught on the next
 * invocation.
 *
 * **Concurrency**
 *
 * Multiple concurrent calls are safe. A generation counter ensures that a
 * late-arriving UNAVAILABLE from an already-replaced pod does not incorrectly
 * flip `isReset` back to `true`, and a late-arriving success from an old pod
 * does not prematurely clear a `true` set by a newer eviction.
 */
export interface SandboxSession {
  /**
   * `true` when the pod is fresh and has not yet been seeded by the caller.
   *
   * Starts `true`. Flips to `false` after the first successful operation.
   * Flips back to `true` after a pod eviction (gRPC `UNAVAILABLE`, code 14).
   *
   * Check this before each tool invocation and run any workspace setup
   * (e.g. writing a connector manifest) when it is `true`.
   */
  readonly isReset: boolean;

  /** Runs a shell command inside the sandbox pod and streams stdout/stderr. */
  runCommand(params: RunCommandParams): Promise<RunCommandResult>;

  /** Reads one or more files from the sandbox pod's filesystem. */
  readFiles(requests: Array<{ path: string; maxReadBytes?: number }>): Promise<ReadFileResult[]>;

  /** Writes one or more files to the sandbox pod's filesystem. */
  writeFiles(files: Array<{ path: string; content: Buffer }>): Promise<WriteFileResult[]>;

  /** Creates directories (including parents) inside the sandbox pod. */
  mkdirs(paths: string[]): Promise<boolean[]>;

  /** Returns metadata (existence, size, type) for paths inside the sandbox pod. */
  statFiles(paths: string[]): Promise<FileMetadata[]>;
}

// ---------------------------------------------------------------------------
// SandboxSessionImpl — per-session wrapper over SandboxApiClient.
//
// Uses a generation counter to protect against a classic race: caller A and
// caller B both start under generation N against a dead pod. A's UNAVAILABLE
// arrives first and increments the generation to N+1. Caller G then runs
// successfully under N+1, setting isReset=false. B's stale UNAVAILABLE arrives
// late — its stored generation (N) no longer matches the current generation
// (N+1), so it does NOT reset isReset back to true.
// ---------------------------------------------------------------------------

export class SandboxSessionImpl implements SandboxSession {
  private _isReset = true;
  private _generation = 0;

  constructor(
    private readonly sessionId: string,
    private readonly apiClient: SandboxApiClient,
    private readonly logger: Logger
  ) {}

  public get isReset(): boolean {
    return this._isReset;
  }

  async runCommand(params: RunCommandParams): Promise<RunCommandResult> {
    return this.execute(() => this.apiClient.runCommand(this.sessionId, params));
  }

  async readFiles(
    requests: Array<{ path: string; maxReadBytes?: number }>
  ): Promise<ReadFileResult[]> {
    return this.execute(() => this.apiClient.readFiles(this.sessionId, requests));
  }

  async writeFiles(files: Array<{ path: string; content: Buffer }>): Promise<WriteFileResult[]> {
    return this.execute(() => this.apiClient.writeFiles(this.sessionId, files));
  }

  async mkdirs(paths: string[]): Promise<boolean[]> {
    return this.execute(() => this.apiClient.mkdirs(this.sessionId, paths));
  }

  async statFiles(paths: string[]): Promise<FileMetadata[]> {
    return this.execute(() => this.apiClient.statFiles(this.sessionId, paths));
  }

  private async execute<T>(fn: () => Promise<T>): Promise<T> {
    const gen = this._generation;
    try {
      const result = await fn();
      if (this._generation === gen) {
        this._isReset = false;
      }
      return result;
    } catch (err) {
      if ((err as any)?.code === 14 /* UNAVAILABLE */ && this._generation === gen) {
        this._generation++;
        this._isReset = true;
        this.logger.warn(
          `Sandbox pod evicted for session ${this.sessionId} — isReset set for next call`
        );
      }
      throw err;
    }
  }
}
