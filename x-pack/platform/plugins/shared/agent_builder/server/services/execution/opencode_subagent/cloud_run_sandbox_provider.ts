/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  Sandbox,
  SandboxCapabilities,
  SandboxInfo,
  SandboxProvider,
  SandboxProviderMetadata,
  SandboxSpec,
} from './sandbox_provider';
import { CloudRunBridgeClient, type CloudRunBridgeConfig } from './cloud_run_bridge_client';
import { CloudRunSandbox, CLOUD_RUN_PROVIDER_ID } from './cloud_run_sandbox';

export { CLOUD_RUN_PROVIDER_ID } from './cloud_run_bridge_client';

export interface CloudRunProviderConfig extends CloudRunBridgeConfig {
  project: string;
  region: string;
  /** Outbound hosts sandboxes may reach (informational for the bridge). */
  egressAllowlist?: string[];
}

/**
 * Cloud Run agent-sandbox provider (public preview). Provisions and manages
 * gVisor micro-VM sandboxes via a bridge service deployed into a Cloud Run
 * service with `--sandbox-launcher`. Drops in behind the generic SandboxProvider
 * interface so warm reuse, the coding runtime, and the UI work unchanged.
 */
export class CloudRunSandboxProvider implements SandboxProvider {
  readonly id = CLOUD_RUN_PROVIDER_ID;
  readonly displayName = 'Google Cloud Run (agent sandbox)';
  readonly capabilities: SandboxCapabilities = {
    supportsSnapshot: false, // deferred (bridge tar export)
    supportsEgressControl: true, // Cloud Run sandboxes support egress restrictions
    isLocal: false,
  };

  private readonly bridge: CloudRunBridgeClient;

  constructor(private readonly config: CloudRunProviderConfig, private readonly logger: Logger) {
    this.bridge = new CloudRunBridgeClient(config, logger);
  }

  async create(spec: SandboxSpec): Promise<Sandbox> {
    this.logger.debug(
      `Provisioning Cloud Run sandbox ${spec.name} via bridge ${this.config.bridgeUrl}`
    );
    await this.bridge.createSandbox(spec.name);
    return new CloudRunSandbox(spec.name, this.bridge);
  }

  async get(id: string): Promise<Sandbox | undefined> {
    // Detached sandboxes are addressed by name; reattach optimistically.
    return new CloudRunSandbox(id, this.bridge);
  }

  async list(): Promise<SandboxInfo[]> {
    // The bridge does not enumerate sandboxes in v1; return empty.
    return [];
  }

  async sweepOrphans(): Promise<void> {
    // Cloud Run sandboxes are ephemeral to the bridge service; nothing to sweep
    // from Kibana's side. The bridge tears them down on `delete`/exit.
  }

  async getMetadata(): Promise<SandboxProviderMetadata> {
    const base: SandboxProviderMetadata = {
      provider: this.id,
      environment: `${this.config.project} / ${this.config.region}`,
      image: 'cloud-run-sandbox-bridge',
      isLocal: false,
      serverUrl: this.config.bridgeUrl,
    };
    try {
      const health = await this.bridge.health();
      return {
        ...base,
        serverVersion: health.version,
        // Surface whether --sandbox-launcher actually mounted the CLI.
        error: health.sandboxTool
          ? undefined
          : 'Bridge reachable but `sandbox` CLI not found — was the service deployed with --sandbox-launcher?',
      };
    } catch (e) {
      return { ...base, error: (e as Error).message };
    }
  }
}
