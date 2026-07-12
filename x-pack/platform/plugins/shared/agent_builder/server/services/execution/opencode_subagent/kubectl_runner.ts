/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import type { Logger } from '@kbn/core/server';
import type { SandboxExecResult } from './sandbox_provider';

export const LOCAL_K8S_PROVIDER_ID = 'local-k8s';

/**
 * Low-level `kubectl` transport shared by the provider and its sandboxes.
 *
 * PoC transport note: this shells out to `kubectl`, which must be on PATH and
 * pointed at a reachable cluster (local `kind` for the spike). A production
 * implementation would use the k8s client library and the exec WebSocket
 * subresource directly rather than shelling out.
 */
export class KubectlRunner {
  constructor(
    public readonly kubeContext: string,
    public readonly namespace: string,
    private readonly logger: Logger
  ) {}

  /** Spawn kubectl with piped (non-null) stdio. */
  spawn(args: string[]): ChildProcessWithoutNullStreams {
    return spawn('kubectl', ['--context', this.kubeContext, '-n', this.namespace, ...args]);
  }

  /** Run kubectl to completion, rejecting on non-zero exit. */
  run(args: string[], input?: string, timeoutMs = 60_000): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = this.spawn(args);
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`kubectl ${args.join(' ')} timed out`));
      }, timeoutMs);
      proc.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
      proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
      proc.on('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(stdout);
        else reject(new Error(`kubectl ${args.join(' ')} failed (${code}): ${stderr}`));
      });
      if (input !== undefined) {
        proc.stdin.write(input);
        proc.stdin.end();
      }
    });
  }

  /** Run kubectl capturing exit code + stdout + stderr WITHOUT rejecting. */
  runResult(
    args: string[],
    { timeoutMs = 60_000 }: { timeoutMs?: number } = {}
  ): Promise<SandboxExecResult> {
    return new Promise((resolve, reject) => {
      const proc = this.spawn(args);
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`kubectl ${args[0]} timed out`));
      }, timeoutMs);
      proc.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
      proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
      proc.on('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({ exitCode: code ?? -1, stdout, stderr });
      });
    });
  }

  warn(message: string): void {
    this.logger.warn(message);
  }
}
