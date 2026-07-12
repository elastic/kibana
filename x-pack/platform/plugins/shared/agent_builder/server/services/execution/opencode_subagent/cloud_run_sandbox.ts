/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildProcessWithoutNullStreams } from 'child_process';
import type { Sandbox, SandboxDescription } from './sandbox_provider';
import type { CloudRunBridgeClient } from './cloud_run_bridge_client';
import { CLOUD_RUN_PROVIDER_ID } from './cloud_run_bridge_client';

export { CLOUD_RUN_PROVIDER_ID } from './cloud_run_bridge_client';

/**
 * A Cloud Run agent sandbox, driven through the bridge. Compute-only: it maps
 * the generic Sandbox surface (spawn/exec/putFiles) onto the bridge's
 * HTTP/WebSocket API, which in turn calls the in-container `sandbox` CLI. Knows
 * nothing about ACP or OpenCode.
 */
export class CloudRunSandbox implements Sandbox {
  readonly providerId = CLOUD_RUN_PROVIDER_ID;

  constructor(public readonly id: string, private readonly bridge: CloudRunBridgeClient) {}

  spawn(argv: string[]): ChildProcessWithoutNullStreams {
    // BridgeChildProcess structurally provides the stdin/stdout/stderr/kill/
    // 'close' surface the ACP runtime uses; cast through unknown for the
    // ChildProcess type the interface expects.
    return this.bridge.spawn(this.id, argv) as unknown as ChildProcessWithoutNullStreams;
  }

  async exec(command: string, { timeoutMs = 60_000 }: { timeoutMs?: number } = {}) {
    return this.bridge.exec(this.id, command, { timeoutMs });
  }

  async putFiles(files: Array<{ path: string; contents: string }>): Promise<void> {
    await this.bridge.putFiles(this.id, files);
  }

  streamLogs(): ChildProcessWithoutNullStreams {
    // Cloud Run activity is streamed through the ACP timeline, not pod logs.
    // Return a spawned `true` so the caller gets a well-formed (empty) stream.
    return this.bridge.spawn(this.id, ['true']) as unknown as ChildProcessWithoutNullStreams;
  }

  async snapshot(): Promise<string | undefined> {
    // Deferred: maps onto the bridge exporting /workspace as a tar (parity with
    // Cloud Run `--export-tar`).
    return undefined;
  }

  async hydrate(_tarBase64: string): Promise<void> {
    // Deferred (see snapshot).
  }

  async describe(): Promise<SandboxDescription> {
    // The bridge keeps detached sandboxes warm; treat a reachable bridge as
    // ready. A dedicated status endpoint could refine this later.
    return { id: this.id, providerId: this.providerId, phase: 'Running', ready: true };
  }

  async stop(): Promise<void> {
    await this.bridge.deleteSandbox(this.id);
  }
}
