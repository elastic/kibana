/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildProcessWithoutNullStreams } from 'child_process';
import type { Sandbox, SandboxDescription } from './sandbox_provider';
import type { KubectlRunner } from './kubectl_runner';
import { LOCAL_K8S_PROVIDER_ID } from './kubectl_runner';

export { LOCAL_K8S_PROVIDER_ID } from './kubectl_runner';

/**
 * A running sandbox pod. Compute-only: it knows how to spawn a process, exec,
 * move files, snapshot and stop — nothing about ACP or OpenCode.
 */
export class KubectlSandbox implements Sandbox {
  readonly providerId = LOCAL_K8S_PROVIDER_ID;

  constructor(public readonly id: string, private readonly kubectl: KubectlRunner) {}

  spawn(argv: string[]): ChildProcessWithoutNullStreams {
    // No TTY (`-t`) so stdio stays a clean pipe for the caller's protocol.
    return this.kubectl.spawn(['exec', '-i', this.id, '--', ...argv]);
  }

  async exec(command: string, { timeoutMs = 60_000 }: { timeoutMs?: number } = {}) {
    return this.kubectl.runResult(
      ['exec', this.id, '--', 'sh', '-lc', `cd /workspace 2>/dev/null; ${command}`],
      { timeoutMs }
    );
  }

  async putFiles(files: Array<{ path: string; contents: string }>): Promise<void> {
    for (const { path, contents } of files) {
      // `kubectl exec -i ... -- sh -c 'cat > path'` streams contents over stdin.
      await this.kubectl.run(['exec', '-i', this.id, '--', 'sh', '-c', `cat > ${path}`], contents);
    }
  }

  streamLogs({ tailLines = 200 }: { tailLines?: number } = {}) {
    return this.kubectl.spawn(['logs', '-f', '--tail', String(tailLines), this.id]);
  }

  /**
   * Export /workspace to a base64 tar. Maps onto Cloud Run's `--export-tar`.
   * Deferred (returns undefined) — the shape is here so the durability layer and
   * a Cloud Run provider share one contract.
   */
  async snapshot(): Promise<string | undefined> {
    return undefined;
  }

  /** Restore a base64 tar into /workspace. Cloud Run parity: `--import-tar`. */
  async hydrate(_tarBase64: string): Promise<void> {
    // Deferred (see snapshot).
  }

  async describe(): Promise<SandboxDescription> {
    try {
      const out = await this.kubectl.run(['get', 'pod', this.id, '-o', 'json'], undefined, 15_000);
      const parsed = JSON.parse(out) as {
        status?: { phase?: string; containerStatuses?: Array<{ ready?: boolean }> };
      };
      return {
        id: this.id,
        providerId: this.providerId,
        phase: parsed.status?.phase ?? 'Unknown',
        ready: Boolean(parsed.status?.containerStatuses?.every((c) => c.ready)),
      };
    } catch {
      return { id: this.id, providerId: this.providerId, phase: 'Unknown', ready: false };
    }
  }

  async stop(): Promise<void> {
    try {
      await this.kubectl.run(
        ['delete', 'pod', this.id, '--ignore-not-found', '--grace-period=5'],
        undefined,
        30_000
      );
    } catch (e) {
      this.kubectl.warn(`Failed to delete sandbox pod ${this.id}: ${(e as Error).message}`);
    }
  }
}
