/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SandboxProfile } from '@kbn/agent-builder-common';
import { SandboxManager } from './sandbox_manager';
import { SandboxRegistry } from './sandbox_registry';
import { OpenCodeAcpRuntime } from './opencode_acp_runtime';
import type { CodingRuntime } from './coding_runtime';
import type {
  Sandbox,
  SandboxSpec,
  SandboxExecResult,
  SandboxProviderMetadata,
} from './sandbox_provider';
import type { OpencodeRunProgress } from './types';
import type { OpencodeRunClient } from './persistence/run_client';
import type { McpAuthMinter } from './mcp_auth_minter';
import type {
  ElasticCliCredentials as MintedElasticCliCredentials,
  ElasticCliCredentialMinter,
} from './elastic_cli_credential_minter';
import { ProfileRuntimeResolver } from './profile_runtime_resolver';
import type {
  SandboxCliConnectorOption,
  ResolvedSandboxCliCredential,
  SandboxCliCredentialResolver,
} from './sandbox_cli_credential_resolver';
import type { SandboxCredentialRequest } from './sandbox_cli_credential_requests';

const kibanaUrlFromMcpUrl = (mcpUrl: string): string => {
  const url = new URL(mcpUrl);
  url.pathname = url.pathname.replace(/\/api\/agent_builder\/mcp\/?$/, '').replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
};

const withCliSuffix = (label: string): string => (/\bcli\b/i.test(label) ? label : `${label} CLI`);

const withConnectorSuffix = (label: string): string =>
  /\bconnector\b/i.test(label) ? label : `${label} connector`;

const sandboxCliCredentialLabel = (credential: ResolvedSandboxCliCredential): string =>
  `${withConnectorSuffix(
    withCliSuffix(credential.connectorDisplayName || credential.label || credential.actionTypeId)
  )} (${credential.connectorName})`;

// Re-export shared types for existing importers.
export type { OpencodePhase, OpencodeItemStatus, OpencodeTodo, OpencodeRunProgress } from './types';
export type { SandboxProviderMetadata } from './sandbox_provider';
export type { SandboxCredentialRequest } from './sandbox_cli_credential_requests';

export interface OpencodeLitellmConfig {
  baseUrl: string;
  apiKey?: string;
  orchestratorModel: string;
  coderModel: string;
}

export interface OpencodeSubagentConfig {
  kubeContext: string;
  namespace: string;
  image: string;
  mcpUrl: string;
  elasticsearchUrl?: string;
  litellm: OpencodeLitellmConfig;
  maxRunSeconds: number;
}

export interface OpencodeRunResult {
  status: 'completed' | 'error';
  answer: string;
  stopReason?: string;
  /** Full activity timeline (final state of every item). */
  timeline: OpencodeRunProgress[];
  /** Raw tool titles OpenCode invoked (for debugging / power users). */
  toolCalls: string[];
  /** The per-run id, for correlation with persisted history. */
  runId: string;
  error?: string;
}

/**
 * Run-scoped context used to persist the run keyed by conversation, so the
 * Sandbox executions flyout can show it after the pod is torn down.
 */
export interface OpencodeRunContext {
  conversationId?: string;
  agentId?: string;
  executionId?: string;
  spaceId: string;
}

export interface ExecuteOpencodeParams {
  prompt: string;
  /**
   * GitHub repository for sandbox git credentials, when the parent agent can
   * determine it structurally. Prefer this over prompt regex extraction.
   */
  repository?: string;
  /**
   * Explicit product credentials the parent Agent Builder agent decided this
   * sandbox run needs. The executor grants only these capabilities.
   */
  credentials?: SandboxCredentialRequest;
  /**
   * Dynamically composed system instructions for the sub-agent (e.g. the
   * catalog of attached connectors and how to call them). Kept separate from the
   * user `prompt` so it maps onto the runtime's dedicated system-prompt slot.
   */
  systemPrompt?: string;
  /**
   * Connector ids this run is allowed to use (resolved from the conversation's
   * connector attachments). Forwarded to the runtime's tool-access scope so the
   * broker/runtime knows exactly which connectors this run may touch.
   */
  allowedConnectors?: string[];
  /**
   * The originating request. Used to mint a per-run, privilege-scoped API key
   * (on behalf of this user) that the sandbox uses to call back into the Agent
   * Builder MCP server, preserving the user's connector RBAC. The key is revoked
   * when the run ends. Secrets never enter the sandbox.
   */
  request: KibanaRequest;
  /** Called for streaming progress so the parent agent/UI can show activity. */
  onProgress?: (progress: OpencodeRunProgress) => void;
  abortSignal?: AbortSignal;
  /** When provided, the run is persisted (keyed by conversation) for history. */
  runContext?: OpencodeRunContext;
  /**
   * The Sandbox Profile (already resolved with secrets) attached to the agent.
   * When provided, the run uses the profile's provider + runtime + policy instead
   * of the process-level default config. This is how an agent "brings" a sandbox.
   */
  profile?: SandboxProfile;
}

/**
 * Orchestrates a coding sub-agent turn by wiring the three layers together:
 *
 *   1. Sandbox lifecycle (SandboxRegistry over a SandboxProvider) — provisions
 *      or reuses a warm, isolated sandbox for the conversation (Model C).
 *   2. Coding runtime (OpenCodeAcpRuntime) — runs the actual coding agent inside
 *      that sandbox and produces the activity timeline.
 *   3. Cross-cutting: mints/revokes the per-run scoped MCP credential and
 *      persists the run (keyed by conversation) for the inspector UI.
 *
 * The executor itself is deliberately thin glue; the reusable abstractions live
 * in sandbox_provider.ts (compute) and coding_runtime.ts (agent).
 */
export class OpencodeSubagentExecutor {
  private readonly provider: SandboxManager;
  private readonly registry: SandboxRegistry;
  private readonly runtime: CodingRuntime;
  private readonly profileResolver: ProfileRuntimeResolver;

  constructor(
    private readonly config: OpencodeSubagentConfig,
    private readonly logger: Logger,
    private readonly runClient?: OpencodeRunClient,
    private readonly mcpAuthMinter?: McpAuthMinter,
    private readonly sandboxCliCredentialResolver?: SandboxCliCredentialResolver,
    private readonly elasticCliCredentialMinter?: ElasticCliCredentialMinter
  ) {
    this.provider = new SandboxManager(
      {
        kubeContext: config.kubeContext,
        namespace: config.namespace,
        image: config.image,
        maxRunSeconds: config.maxRunSeconds,
      },
      logger
    );
    // Model C: keep one warm sandbox per conversation (reuse across turns) with
    // an idle TTL + hard max-lifetime reaper. Provider-agnostic, so a Cloud Run
    // provider slots in without touching this lifecycle.
    this.registry = new SandboxRegistry(this.provider, logger);
    this.registry.start();
    this.runtime = new OpenCodeAcpRuntime(logger.get('runtime'));
    // Per-profile provider/runtime stacks (for agents that bring a Sandbox
    // Profile). The LiteLLM api key remains a process-level secret shared across
    // profiles for the PoC.
    this.profileResolver = new ProfileRuntimeResolver(
      logger.get('profiles'),
      () => this.config.litellm.apiKey
    );
  }

  /** Reap sandbox pods orphaned by a prior process (e.g. a dev hot-reload). */
  async sweepOrphans(): Promise<void> {
    await this.provider.sweepOrphans();
    await this.profileResolver.sweepOrphans();
  }

  /** Tear down all warm sandboxes + stop the reaper (plugin stop). */
  async shutdown(): Promise<void> {
    this.registry.stop();
    await this.registry.reapAll();
    await this.profileResolver.shutdown();
  }

  /** List current sandbox instances (for the Sandboxes inspector UI). */
  listPods() {
    return this.provider.list();
  }

  /** Cluster / context metadata (which environment the default sandbox runs on). */
  getClusterMetadata(): Promise<SandboxProviderMetadata> {
    return this.provider.getMetadata();
  }

  /** Provider metadata for a specific profile (Sandboxes page). */
  getProfileMetadata(profile: SandboxProfile): Promise<SandboxProviderMetadata> {
    return this.profileResolver.getMetadata(profile);
  }

  listSandboxCliConnectors({
    request,
    allowedConnectors,
  }: {
    request: KibanaRequest;
    allowedConnectors?: string[];
  }): Promise<SandboxCliConnectorOption[]> {
    if (!this.sandboxCliCredentialResolver) {
      return Promise.resolve([]);
    }
    return this.sandboxCliCredentialResolver.listAvailable({ request, allowedConnectors });
  }

  /**
   * Test a profile end-to-end enough to prove it can run a coding sub-agent:
   * gather provider metadata, provision a throwaway sandbox, run `echo` in it,
   * and tear it down. Returns a structured report for the Sandboxes page.
   */
  async testProfile(profile: SandboxProfile): Promise<{
    ok: boolean;
    metadata?: SandboxProviderMetadata;
    steps: Array<{ name: string; ok: boolean; detail?: string; durationMs: number }>;
  }> {
    const steps: Array<{ name: string; ok: boolean; detail?: string; durationMs: number }> = [];
    const time = async <T>(name: string, fn: () => Promise<T>): Promise<T | undefined> => {
      const start = Date.now();
      try {
        const result = await fn();
        steps.push({ name, ok: true, durationMs: Date.now() - start });
        return result;
      } catch (e) {
        steps.push({
          name,
          ok: false,
          detail: (e as Error).message,
          durationMs: Date.now() - start,
        });
        return undefined;
      }
    };

    const resolved = this.profileResolver.resolve(profile);
    const metadata = await time('provider_metadata', () => resolved.provider.getMetadata());

    let sandbox: Sandbox | undefined;
    await time('provision_sandbox', async () => {
      sandbox = await resolved.provider.create({
        name: `sandbox-test-${Date.now().toString(36)}`,
        image: resolved.image,
        labels: { test: 'true' },
      });
    });

    if (sandbox) {
      const current = sandbox;
      await time('exec_echo', async () => {
        const res = await current.exec('echo sandbox-ok', { timeoutMs: 20_000 });
        if (res.exitCode !== 0 || !res.stdout.includes('sandbox-ok')) {
          throw new Error(`unexpected exec result: exit=${res.exitCode} out=${res.stdout.trim()}`);
        }
      });
      await time('teardown', () => current.stop());
    }

    return { ok: steps.every((s) => s.ok), metadata, steps };
  }

  /** Execute an arbitrary command inside a running sandbox (PoC inspector). */
  async execCommand(
    sandboxId: string,
    command: string,
    opts?: { timeoutMs?: number }
  ): Promise<SandboxExecResult> {
    const sandbox = await this.provider.get(sandboxId);
    if (!sandbox) {
      return { exitCode: -1, stdout: '', stderr: `Sandbox ${sandboxId} not found` };
    }
    return sandbox.exec(command, opts);
  }

  async execute({
    prompt,
    repository,
    credentials,
    systemPrompt,
    allowedConnectors,
    request,
    onProgress,
    abortSignal,
    runContext,
    profile,
  }: ExecuteOpencodeParams): Promise<OpencodeRunResult> {
    const runId = `opencode-run-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const provisionName = `opencode-sandbox-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const conversationKey = runContext?.conversationId ?? runId;

    // Select the runtime stack: an agent's Sandbox Profile (its own provider,
    // runtime, policy) if attached, otherwise the process-level default config.
    const stack = profile
      ? (() => {
          const r = this.profileResolver.resolve(profile);
          const conn = profile.connection;
          const environment =
            conn.type === 'local-k8s' ? conn.kubeContext : `${conn.project} / ${conn.region}`;
          const namespace = conn.type === 'local-k8s' ? conn.namespace : conn.region;
          return {
            registry: r.registry,
            runtime: r.runtime,
            litellm: r.litellm,
            image: r.image,
            maxRunSeconds: r.maxRunSeconds,
            provider: profile.provider,
            environment,
            namespace,
          };
        })()
      : {
          registry: this.registry,
          runtime: this.runtime,
          litellm: this.config.litellm,
          image: this.config.image,
          maxRunSeconds: this.config.maxRunSeconds,
          provider: 'local-k8s' as const,
          environment: this.config.kubeContext,
          namespace: this.config.namespace,
        };

    const timeline: OpencodeRunProgress[] = [];
    const itemsById = new Map<string, OpencodeRunProgress>();
    let sandboxAcquired = false;
    let fatalSandbox = false;

    // Mint a per-run, privilege-scoped MCP loopback credential on behalf of the
    // user. The sandbox holds only this short-lived capability, never a connector
    // secret; it is revoked below. Falls back to a dev header when unavailable.
    const mcpAuth = this.mcpAuthMinter
      ? await this.mcpAuthMinter.mint(request, `${Math.ceil(stack.maxRunSeconds / 60) + 5}m`)
      : {
          header: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
          revoke: async () => {},
        };

    const sandboxCliCredentialRequests = credentials?.cli ?? [];
    const elasticAccess = credentials?.elastic;
    const shouldResolveElasticCliCredentials = Boolean(
      elasticAccess?.kibana || elasticAccess?.elasticsearch
    );
    let elasticCliCredentials: MintedElasticCliCredentials | undefined;
    let resolvedSandboxCliCredentials: ResolvedSandboxCliCredential[] = [];
    const sandboxCliCredentialDiagnostics: string[] = [];

    const persist = this.runClient && runContext;

    // Throttle timeline persistence: coalesce bursts into at most one write/interval.
    let persistTimer: ReturnType<typeof setTimeout> | undefined;
    let persistDirty = false;
    const flushTimeline = async () => {
      if (!persist || !persistDirty) return;
      persistDirty = false;
      try {
        await this.runClient!.updateTimeline(
          runId,
          timeline.map((i) => ({ ...i }))
        );
      } catch (e) {
        this.logger.debug(`opencode run timeline persist failed: ${(e as Error).message}`);
      }
    };
    const schedulePersist = () => {
      if (!persist) return;
      persistDirty = true;
      if (persistTimer) return;
      persistTimer = setTimeout(() => {
        persistTimer = undefined;
        void flushTimeline();
      }, 1000);
    };

    // Merge runtime progress into our timeline (by id) + stream to the parent/UI.
    const recordProgress = (item: OpencodeRunProgress) => {
      const existing = itemsById.get(item.id);
      if (!existing) {
        itemsById.set(item.id, { ...item });
        timeline.push(itemsById.get(item.id)!);
      } else {
        Object.assign(existing, item);
      }
      onProgress?.({ ...item });
      schedulePersist();
    };

    // Local helper to surface provisioning/lifecycle items in the same timeline.
    const emitLifecycle = (item: OpencodeRunProgress) => recordProgress(item);

    try {
      if (shouldResolveElasticCliCredentials && this.elasticCliCredentialMinter && elasticAccess) {
        elasticCliCredentials = await this.elasticCliCredentialMinter.mint(
          request,
          {
            kibanaUrl: kibanaUrlFromMcpUrl(this.config.mcpUrl),
            elasticsearchUrl: this.config.elasticsearchUrl,
            spaceId: runContext?.spaceId,
            access: elasticAccess,
          },
          `${Math.ceil(stack.maxRunSeconds / 60) + 5}m`
        );
      }

      if (shouldResolveElasticCliCredentials) {
        const elasticCredentialFailure = !elasticCliCredentials
          ? 'Unable to mint or reuse an API key for Elastic CLI'
          : undefined;
        recordProgress({
          id: 'elastic-cli-credentials',
          phase: 'credential',
          label: elasticCliCredentials
            ? 'Prepared Elastic CLI credentials'
            : 'No Elastic CLI credentials prepared',
          status: elasticCliCredentials ? 'completed' : 'failed',
          iconType: 'logoElasticsearch',
          credentialIconVariant: 'secured',
          detail: elasticCliCredentials
            ? `source: ${elasticCliCredentials.source}; kibana: ${
                elasticAccess?.kibana ?? 'none'
              }; elasticsearch: ${elasticAccess?.elasticsearch ?? 'none'}`
            : 'Unable to mint or reuse an API key for Elastic CLI',
        });
        if (elasticCredentialFailure) {
          throw new Error(
            `Elastic CLI credentials are required for this sandbox run, but could not be prepared: ${elasticCredentialFailure}`
          );
        }
      }

      if (sandboxCliCredentialRequests.length > 0 && this.sandboxCliCredentialResolver) {
        resolvedSandboxCliCredentials = await this.sandboxCliCredentialResolver.resolveAll({
          request,
          allowedConnectors,
          requested: sandboxCliCredentialRequests,
          onDiagnostic: (message) => sandboxCliCredentialDiagnostics.push(message),
        });
      } else if (sandboxCliCredentialRequests.length > 0) {
        sandboxCliCredentialDiagnostics.push('Sandbox CLI credential resolver unavailable');
      }

      if (sandboxCliCredentialRequests.length > 0) {
        const missingCredentialCount =
          sandboxCliCredentialRequests.length - resolvedSandboxCliCredentials.length;
        const sandboxCliCredentialFailure =
          missingCredentialCount > 0
            ? sandboxCliCredentialDiagnostics.length > 0
              ? sandboxCliCredentialDiagnostics.join('; ')
              : `Unable to resolve ${missingCredentialCount} sandbox CLI credential request(s)`
            : undefined;
        if (sandboxCliCredentialFailure) {
          recordProgress({
            id: 'sandbox-cli-credentials',
            phase: 'credential',
            label: 'No sandbox CLI credentials prepared',
            status: 'failed',
            credentialIconVariant: 'secured',
            detail: sandboxCliCredentialFailure,
          });
        } else {
          for (const credential of resolvedSandboxCliCredentials) {
            recordProgress({
              id: `sandbox-cli-credentials-${credential.connectorId}`,
              phase: 'credential',
              label: `Prepared ${sandboxCliCredentialLabel(credential)} credentials`,
              status: 'completed',
              actionTypeId: credential.actionTypeId,
              connectorId: credential.connectorId,
              credentialIconVariant: 'secured',
              detail: credential.token.expiresAt
                ? `source: ${credential.token.source}; expires: ${new Date(
                    credential.token.expiresAt
                  ).toISOString()}`
                : `source: ${credential.token.source}`,
            });
          }
        }
        if (sandboxCliCredentialFailure) {
          throw new Error(
            `Sandbox CLI credentials are required for this run, but could not be prepared: ${sandboxCliCredentialFailure}`
          );
        }
      }

      emitLifecycle({
        id: 'provisioning',
        phase: 'provisioning',
        label: 'Provisioning sandbox',
        status: 'in_progress',
      });

      const spec: SandboxSpec = {
        name: provisionName,
        image: stack.image,
        labels: { conversation: conversationKey },
      };
      const { sandbox, reused } = await stack.registry.acquire(conversationKey, spec);
      sandboxAcquired = true;
      abortSignal?.throwIfAborted?.();

      if (persist) {
        try {
          await this.runClient!.create({
            runId,
            conversationId: runContext!.conversationId ?? 'unknown',
            agentId: runContext!.agentId,
            executionId: runContext!.executionId,
            spaceId: runContext!.spaceId,
            prompt,
            podName: sandbox.id,
            provider: stack.provider,
            kubeContext: stack.environment,
            namespace: stack.namespace,
          });
        } catch (e) {
          this.logger.warn(`Failed to create opencode run record: ${(e as Error).message}`);
        }
      }

      emitLifecycle({
        id: 'provisioning',
        phase: 'provisioning',
        label: reused ? 'Reused warm sandbox' : 'Provisioning sandbox',
        status: 'completed',
        detail: reused ? `Reusing ${sandbox.id} from this conversation` : undefined,
      });
      emitLifecycle({
        id: 'connecting',
        phase: 'connecting',
        label: reused
          ? 'Warm sandbox ready, starting OpenCode'
          : 'Sandbox ready, starting OpenCode',
        status: 'completed',
      });

      const result = await stack.runtime.run({
        sandbox,
        prompt,
        systemPrompt,
        modelConfig: stack.litellm,
        toolAccess: {
          mcpUrl: this.config.mcpUrl,
          mcpAuthHeader: mcpAuth.header,
          allowedConnectors,
        },
        elasticCliCredentials,
        sandboxCliCredentials: resolvedSandboxCliCredentials,
        timeoutMs: stack.maxRunSeconds * 1000,
        onProgress: recordProgress,
        abortSignal,
      });

      emitLifecycle({ id: 'done', phase: 'done', label: 'Finished', status: 'completed' });

      if (persist) {
        await this.runClient!.finish(runId, {
          status: 'completed',
          answer: result.answer,
          timeline: timeline.map((i) => ({ ...i })),
        }).catch((e) =>
          this.logger.warn(`Failed to finalize opencode run: ${(e as Error).message}`)
        );
      }

      return {
        status: 'completed',
        answer: result.answer,
        stopReason: result.stopReason,
        timeline,
        toolCalls: result.toolCalls,
        runId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenCode sub-agent run failed: ${message}`);
      if (!sandboxAcquired) fatalSandbox = true;
      if (persist) {
        await this.runClient!.finish(runId, {
          status: 'error',
          error: message,
          timeline: timeline.map((i) => ({ ...i })),
        }).catch(() => {});
      }
      return {
        status: 'error',
        answer: '',
        timeline,
        toolCalls: [],
        runId,
        error: message,
      };
    } finally {
      if (persistTimer) clearTimeout(persistTimer);
      await flushTimeline();
      // Revoke the per-run MCP credential so it dies with the (short-lived) config.
      await mcpAuth.revoke();
      await elasticCliCredentials?.revoke();
      if (resolvedSandboxCliCredentials.length > 0 && this.sandboxCliCredentialResolver) {
        await this.sandboxCliCredentialResolver
          .revokeAll({ request, credentials: resolvedSandboxCliCredentials })
          .catch((e) =>
            this.logger.warn(`Failed to revoke sandbox CLI credentials: ${(e as Error).message}`)
          );
      }
      // Model C: keep the sandbox warm for the next turn; release the lease so the
      // idle reaper takes over. Discard only if a fatal error left it unusable.
      if (sandboxAcquired) {
        await stack.registry.release(conversationKey, { discard: fatalSandbox });
      }
    }
  }
}
