/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxProfile } from '@kbn/agent-builder-common';
import { CLOUD_RUN_SA_SECRET_KEY, resolveSandboxCapabilities } from '@kbn/agent-builder-common';
import { SandboxManager } from './sandbox_manager';
import { CloudRunSandboxProvider } from './cloud_run_sandbox_provider';
import { SandboxRegistry, type SandboxRegistryConfig } from './sandbox_registry';
import { OpenCodeAcpRuntime } from './opencode_acp_runtime';
import { PiPrintRuntime } from './pi_print_runtime';
import type { CodingRuntime } from './coding_runtime';
import type { SandboxProvider, SandboxProviderMetadata } from './sandbox_provider';
import type { OpencodeLitellmConfig } from './executor';

/** A profile carrying decrypted secrets (as resolved by the profile provider). */
type ProfileWithSecrets = SandboxProfile & { secrets?: Record<string, string> };

/** Default sandbox image name used by providers that don't carry one. */
const CLOUD_RUN_IMAGE = 'cloud-run-sandbox-bridge';

/**
 * A profile resolved to the concrete objects one coding turn needs:
 *
 *   provider  — the compute backend (maps profile.provider -> SandboxProvider)
 *   registry  — warm-reuse lifecycle over that provider (TTLs from profile.policy)
 *   runtime   — the coding agent (maps profile.runtime -> CodingRuntime)
 *   litellm   — model routing the runtime uses
 *   image / maxRunSeconds — spec + turn budget
 *
 * Cached per profile id so consecutive turns of a conversation reuse the same
 * provider + registry (and thus the same warm sandbox). This is the small
 * "provider/runtime registry" layer that lets one Kibana serve many profiles.
 */
export interface ResolvedProfileRuntime {
  provider: SandboxProvider;
  registry: SandboxRegistry;
  runtime: CodingRuntime;
  litellm: OpencodeLitellmConfig;
  image: string;
  maxRunSeconds: number;
}

/** How the LiteLLM api key (a process-level secret) is supplied per resolution. */
export type LitellmApiKeyProvider = () => string | undefined;

export class ProfileRuntimeResolver {
  private readonly cache = new Map<string, ResolvedProfileRuntime>();

  constructor(
    private readonly logger: Logger,
    private readonly getLitellmApiKey: LitellmApiKeyProvider
  ) {}

  /**
   * Build (or reuse) the runtime stack for a profile. `profile` must already be
   * resolved with any secrets by the caller. Only 'opencode' runtime is
   * supported today; unknown ids throw so misconfiguration is loud.
   */
  resolve(profile: ProfileWithSecrets): ResolvedProfileRuntime {
    const cached = this.cache.get(profile.id);
    if (cached) return cached;

    const { provider, image } = this.buildProvider(profile);
    const { runtimeConfig, policy } = profile;

    const registryConfig: SandboxRegistryConfig = {
      idleTtlMs: policy.idleTtlMs,
      maxLifetimeMs: policy.maxLifetimeMs,
      reaperIntervalMs: 60 * 1000,
    };
    const registry = new SandboxRegistry(
      provider,
      this.logger.get(`registry.${profile.id}`),
      registryConfig
    );
    registry.start();

    // Map the runtime + its config. OpenCode uses distinct orchestrator/coder
    // models; pi (print protocol) uses a single model, mapped to both so the
    // shared litellm plumbing stays runtime-neutral.
    let runtime: CodingRuntime;
    let litellm: OpencodeLitellmConfig;
    if (runtimeConfig.type === 'pi') {
      runtime = new PiPrintRuntime(this.logger.get(`runtime.${profile.id}`));
      litellm = {
        baseUrl: runtimeConfig.baseUrl,
        apiKey: this.getLitellmApiKey(),
        orchestratorModel: runtimeConfig.model,
        coderModel: runtimeConfig.model,
      };
    } else if (runtimeConfig.type === 'opencode') {
      runtime = new OpenCodeAcpRuntime(this.logger.get(`runtime.${profile.id}`));
      litellm = {
        baseUrl: runtimeConfig.baseUrl,
        apiKey: this.getLitellmApiKey(),
        orchestratorModel: runtimeConfig.orchestratorModel,
        coderModel: runtimeConfig.coderModel,
      };
    } else {
      throw new Error(`Unsupported coding runtime: ${profile.runtime}`);
    }

    const resolved: ResolvedProfileRuntime = {
      provider,
      registry,
      runtime,
      litellm,
      image,
      maxRunSeconds: Math.ceil(policy.maxRunSeconds),
    };
    this.cache.set(profile.id, resolved);
    return resolved;
  }

  /** Map a profile's provider + connection to a concrete SandboxProvider. */
  private buildProvider(profile: ProfileWithSecrets): {
    provider: SandboxProvider;
    image: string;
  } {
    const { connection, policy } = profile;
    const log = this.logger.get(`provider.${profile.id}`);

    // Resolve the tier preset + per-axis overrides once, then map the compute
    // axes (egress, filesystem) onto what each provider can enforce today.
    const caps = resolveSandboxCapabilities(policy);
    const egressAllowlist = this.effectiveEgressAllowlist(caps.egress, caps.egressAllowlist);
    const readOnlyRootFs = caps.filesystem === 'ephemeral-ro';

    if (connection.type === 'local-k8s') {
      return {
        provider: new SandboxManager(
          {
            kubeContext: connection.kubeContext,
            namespace: connection.namespace,
            image: connection.image,
            maxRunSeconds: Math.ceil(policy.maxRunSeconds),
            egressAllowlist,
            readOnlyRootFs,
          },
          log
        ),
        image: connection.image,
      };
    }

    if (connection.type === 'cloud-run') {
      const serviceAccountKeyJson = profile.secrets?.[CLOUD_RUN_SA_SECRET_KEY];
      return {
        provider: new CloudRunSandboxProvider(
          {
            project: connection.project,
            region: connection.region,
            bridgeUrl: connection.bridgeUrl,
            audience: connection.audience,
            serviceAccountKeyJson,
            egressAllowlist,
          },
          log
        ),
        image: CLOUD_RUN_IMAGE,
      };
    }

    throw new Error(`Unsupported sandbox provider: ${profile.provider}`);
  }

  /**
   * Translate the egress *mode* into a concrete allowlist a provider enforces:
   * - `open`      → undefined (no restriction)
   * - `allowlist` → the configured hosts (+ always-needed model gateway / MCP loopback)
   * - `deny`      → only the always-needed hosts (model gateway + MCP loopback),
   *   so the sandbox can still reason + call back, but reach nothing else.
   */
  private effectiveEgressAllowlist(
    mode: 'deny' | 'allowlist' | 'open',
    configured?: string[]
  ): string[] | undefined {
    if (mode === 'open') return undefined;
    // Hosts the runtime always needs regardless of tier: the model gateway and
    // the MCP loopback back to Kibana. These are the minimum for any coding turn.
    const essential = ['host.docker.internal', 'elastic.litellm-prod.ai'];
    if (mode === 'deny') return essential;
    return Array.from(new Set([...essential, ...(configured ?? [])]));
  }

  /** Provider metadata for a profile, for the Sandboxes page (no run). */
  async getMetadata(profile: SandboxProfile): Promise<SandboxProviderMetadata> {
    return this.resolve(profile).provider.getMetadata();
  }

  /** Stop all registries + reap warm sandboxes (plugin stop). Never throws. */
  async shutdown(): Promise<void> {
    for (const resolved of this.cache.values()) {
      resolved.registry.stop();
      try {
        await resolved.registry.reapAll();
      } catch {
        // best-effort
      }
    }
    this.cache.clear();
  }

  /** Sweep orphaned sandboxes for every known profile provider. */
  async sweepOrphans(): Promise<void> {
    for (const resolved of this.cache.values()) {
      try {
        await resolved.provider.sweepOrphans();
      } catch {
        // best-effort
      }
    }
  }
}
