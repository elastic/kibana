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

export interface SandboxSession {
  /**
   * True on first use and after pod eviction (gRPC UNAVAILABLE). Goes false after the first
   * successful operation. Callers should check this before each tool invocation and run any
   * workspace setup (e.g. writing a connector manifest) when it is true.
   */
  readonly isReset: boolean;

  runCommand(params: RunCommandParams): Promise<RunCommandResult>;
  readFiles(requests: Array<{ path: string; maxReadBytes?: number }>): Promise<ReadFileResult[]>;
  writeFiles(files: Array<{ path: string; content: Buffer }>): Promise<WriteFileResult[]>;
  mkdirs(paths: string[]): Promise<boolean[]>;
  statFiles(paths: string[]): Promise<FileMetadata[]>;
}

// ---------------------------------------------------------------------------
// SandboxSessionImpl — per-conversation wrapper over SandboxApiClient.
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
    private readonly conversationId: string,
    private readonly apiClient: SandboxApiClient,
    private readonly logger: Logger
  ) {}

  public get isReset(): boolean {
    return this._isReset;
  }

  async runCommand(params: RunCommandParams): Promise<RunCommandResult> {
    return this.execute(() => this.apiClient.runCommand(this.conversationId, params));
  }

  async readFiles(
    requests: Array<{ path: string; maxReadBytes?: number }>
  ): Promise<ReadFileResult[]> {
    return this.execute(() => this.apiClient.readFiles(this.conversationId, requests));
  }

  async writeFiles(files: Array<{ path: string; content: Buffer }>): Promise<WriteFileResult[]> {
    return this.execute(() => this.apiClient.writeFiles(this.conversationId, files));
  }

  async mkdirs(paths: string[]): Promise<boolean[]> {
    return this.execute(() => this.apiClient.mkdirs(this.conversationId, paths));
  }

  async statFiles(paths: string[]): Promise<FileMetadata[]> {
    return this.execute(() => this.apiClient.statFiles(this.conversationId, paths));
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
          `Sandbox pod evicted for conversation ${this.conversationId} — isReset set for next call`
        );
      }
      throw err;
    }
  }
}
