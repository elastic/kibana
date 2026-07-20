/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SandboxProfile } from '@kbn/agent-builder-common';
import { GITHUB_APP_PRIVATE_KEY_SECRET_KEY } from '@kbn/agent-builder-common';
import { SandboxManager } from './sandbox_manager';
import { SandboxRegistry } from './sandbox_registry';
import { OpenCodeAcpRuntime } from './opencode_acp_runtime';
import type { CodingRuntime, GitCredentials } from './coding_runtime';
import type {
  Sandbox,
  SandboxSpec,
  SandboxExecResult,
  SandboxProviderMetadata,
} from './sandbox_provider';
import type { OpencodeRunProgress } from './types';
import type { OpencodeRunClient } from './persistence/run_client';
import type { McpAuthMinter } from './mcp_auth_minter';
import type { GithubTokenResolver, GitHubTokenAccess } from './github_token_resolver';
import type {
  ElasticCliAccess,
  ElasticCliCredentials as MintedElasticCliCredentials,
  ElasticCliCredentialMinter,
} from './elastic_cli_credential_minter';
import type {
  GcpCliCredentialRequest,
  GcpCliCredentials as ResolvedGcpCliCredentials,
  GcpCliCredentialResolver,
} from './gcp_cli_credential_resolver';
import { GithubUserCredentialSource } from './github_user_credential_source';
import { GithubAppTokenMinter } from './github_app_token_minter';
import { ProfileRuntimeResolver } from './profile_runtime_resolver';

/** A profile as it arrives at the executor: resolved with decrypted secrets. */
type ProfileWithSecrets = SandboxProfile & { secrets?: Record<string, string> };

const normalizeGithubRepo = (owner: string, repo: string): string =>
  `${owner}/${repo.replace(/\.git$/i, '')}`;

const normalizeGithubRepoInput = (repository: string): string | undefined => {
  const trimmed = repository.trim();
  const urlMatch = trimmed.match(
    /github\.com[:/]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?(?:[/?#\s`'")]|$)/i
  );
  if (urlMatch?.[1] && urlMatch[2]) {
    return normalizeGithubRepo(urlMatch[1], urlMatch[2]);
  }

  const shorthandMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?$/);
  if (shorthandMatch?.[1] && shorthandMatch[2]) {
    return normalizeGithubRepo(shorthandMatch[1], shorthandMatch[2]);
  }
};

const extractGithubRepoFromPrompt = (prompt: string): string | undefined => {
  const urlMatch = prompt.match(
    /github\.com[:/]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?(?:[/?#\s`'")]|$)/i
  );
  if (urlMatch?.[1] && urlMatch[2]) {
    return normalizeGithubRepo(urlMatch[1], urlMatch[2]);
  }

  const prefixedShorthandMatch = prompt.match(
    /\b(?:github\s+repo(?:sitory)?|repo(?:sitory)?|clone)\s+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:[\s`'",.)]|$)/i
  );
  if (prefixedShorthandMatch?.[1] && prefixedShorthandMatch[2]) {
    return normalizeGithubRepo(prefixedShorthandMatch[1], prefixedShorthandMatch[2]);
  }

  const suffixedShorthandMatch = prompt.match(
    /\b([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?\s+(?:github\s+)?repo(?:sitory)?\b/i
  );
  if (suffixedShorthandMatch?.[1] && suffixedShorthandMatch[2]) {
    return normalizeGithubRepo(suffixedShorthandMatch[1], suffixedShorthandMatch[2]);
  }
};

const gitAccessFromPrompt = (
  prompt: string,
  requestedRepo?: string
): GitHubTokenAccess | undefined => {
  if (!requestedRepo) return undefined;
  if (
    /\b(gh\s+pr\s+create|open\s+(a\s+)?pr|open\s+(a\s+)?pull request|pull request|push|commit)\b/i.test(
      prompt
    )
  ) {
    return 'push-pr';
  }
  return 'read';
};

const gitAccessForRun = (
  profile: SandboxProfile | undefined,
  prompt: string,
  requestedRepo?: string
): GitHubTokenAccess | undefined => {
  const mode = profile?.policy?.git?.mode;
  if (mode === 'clone-ro') return 'read';
  if (mode === 'push-pr') return 'push-pr';
  if (mode === 'none') return undefined;
  return gitAccessFromPrompt(prompt, requestedRepo);
};

const kibanaUrlFromMcpUrl = (mcpUrl: string): string => {
  const url = new URL(mcpUrl);
  url.pathname = url.pathname.replace(/\/api\/agent_builder\/mcp\/?$/, '').replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
};

const githubCredentialFailureMessage = (diagnostics: string[]): string =>
  diagnostics.length > 0
    ? diagnostics.join('; ')
    : 'GitHub credentials were requested, but Agent Builder could not resolve a usable token. Ask the user to clarify the repository or update the GitHub connector allowed repositories.';

// Re-export shared types for existing importers.
export type { OpencodePhase, OpencodeItemStatus, OpencodeTodo, OpencodeRunProgress } from './types';
export type { SandboxProviderMetadata } from './sandbox_provider';

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

export interface SandboxCredentialRequest {
  github?: {
    repository?: string;
    access?: GitHubTokenAccess;
  };
  elastic?: {
    kibana?: ElasticCliAccess;
    elasticsearch?: ElasticCliAccess;
  };
  gcp?: GcpCliCredentialRequest;
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

  /**
   * Per-profile GitHub user-token credential source (Device Flow), built from the
   * profile's own `githubApp` config + private-key secret. Cached by profile id
   * so the acquired user token survives across turns of a conversation. This is
   * per-sandbox config, not global Kibana config.
   */
  private readonly userCredentialSources = new Map<string, GithubUserCredentialSource>();

  constructor(
    private readonly config: OpencodeSubagentConfig,
    private readonly logger: Logger,
    private readonly runClient?: OpencodeRunClient,
    private readonly mcpAuthMinter?: McpAuthMinter,
    private readonly gitTokenResolver?: GithubTokenResolver,
    private readonly elasticCliCredentialMinter?: ElasticCliCredentialMinter,
    private readonly gcpCliCredentialResolver?: GcpCliCredentialResolver
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

  /**
   * Build (or reuse) the GitHub user-token credential source for a profile. The
   * OAuth client id + App private key come from the profile itself (not global
   * config), so each sandbox carries its own git credential story. Returns
   * `undefined` when the profile has no App client id configured.
   */
  private getUserCredentialSource(
    profile?: ProfileWithSecrets
  ): GithubUserCredentialSource | undefined {
    const clientId = profile?.githubApp?.clientId;
    if (!profile || !GithubUserCredentialSource.isConfigured(clientId)) {
      return undefined;
    }
    const cached = this.userCredentialSources.get(profile.id);
    if (cached) return cached;
    const source = new GithubUserCredentialSource(
      clientId,
      this.logger.get(`githubUser.${profile.id}`)
    );
    this.userCredentialSources.set(profile.id, source);
    return source;
  }

  /**
   * Mint an ephemeral, repo-scoped GitHub App *installation token* for the git
   * operations (clone/push/PR) this run needs — the least-privilege machine
   * credential. Requires the profile to carry an App id + private-key secret.
   * Repos are taken from the profile's git policy (falling back to the owner the
   * App is installed on). Emits a green `credential` timeline item. Returns
   * `undefined` when the profile has no App configured or minting fails.
   */
  private async resolveInstallToken(
    profile: ProfileWithSecrets | undefined,
    onProgress?: (progress: OpencodeRunProgress) => void
  ): Promise<{ token: string; connectorId: string } | undefined> {
    const appId = profile?.githubApp?.appId;
    const privateKey = profile?.secrets?.[GITHUB_APP_PRIVATE_KEY_SECRET_KEY];
    if (!appId || !privateKey) return undefined;

    // Repos this run may touch (owner/repo). Scope the token to just these; the
    // account login is derived from the first repo's owner.
    const repos = profile?.policy?.git?.repos ?? [];
    const owner = repos[0]?.split('/')[0];
    const repoNames = repos.map((r) => r.split('/')[1]).filter(Boolean);
    if (!owner) {
      this.logger.warn(
        `Profile ${profile?.id} has a GitHub App but no git repos in policy; cannot scope an installation token`
      );
      return undefined;
    }

    const itemId = 'github-install-token';
    onProgress?.({
      id: itemId,
      phase: 'credential',
      label: 'Minting scoped GitHub token',
      status: 'in_progress',
      detail: `Requesting a short-lived token scoped to ${repos.join(', ')} (push + PR).`,
    });

    try {
      const minter = new GithubAppTokenMinter(
        { appId, privateKeyPem: privateKey },
        this.logger.get(`githubApp.${profile?.id}`)
      );
      const minted = await minter.mintForAccount(owner, {
        repositories: repoNames.length > 0 ? repoNames : undefined,
        permissions: { contents: 'write', pull_requests: 'write' },
      });
      const perms = Object.entries(minted.permissions)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      onProgress?.({
        id: itemId,
        phase: 'credential',
        label: 'Minted scoped GitHub token',
        status: 'completed',
        detail: `${repos.join(', ')} · ${perms} · expires ${new Date(
          minted.expiresAt
        ).toLocaleTimeString()}`,
      });
      return { token: minted.token, connectorId: `github-app:${appId}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to mint GitHub App installation token: ${message}`);
      onProgress?.({
        id: itemId,
        phase: 'credential',
        label: 'Could not mint GitHub token',
        status: 'failed',
        detail: message,
      });
      return undefined;
    }
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

    // Resolve GitHub credentials for real git operations (clone/push/PR) from the
    // run's allowed connectors. The token is a deliberate, scoped exception to
    // "no secrets in sandbox": raw git needs a git-usable credential in the pod.
    // Injected + scrubbed by the runtime; rely on short PAT expiry as backstop.
    // A user-token (Device Flow) source is resolved lazily inside `try` so its
    // interactive "authorize" step can stream into the timeline.
    const credentialRepository = credentials?.github?.repository ?? repository;
    const requestedGitRepo =
      (credentialRepository ? normalizeGithubRepoInput(credentialRepository) : undefined) ??
      extractGithubRepoFromPrompt(prompt);
    const requestedGitAccess =
      credentials?.github?.access ?? gitAccessForRun(profile, prompt, requestedGitRepo);
    const shouldResolveGitCredentials = Boolean(credentials?.github ?? repository);
    const elasticAccess = credentials?.elastic;
    const shouldResolveElasticCliCredentials = Boolean(
      elasticAccess?.kibana || elasticAccess?.elasticsearch
    );
    const gcpAccess = credentials?.gcp;
    const shouldResolveGcpCliCredentials = Boolean(gcpAccess);
    let gitCredentials: GitCredentials | undefined;
    let elasticCliCredentials: MintedElasticCliCredentials | undefined;
    let gcpCliCredentials: ResolvedGcpCliCredentials | undefined;
    const gitCredentialDiagnostics: string[] = [];
    const gcpCredentialDiagnostics: string[] = [];

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
      }

      if (shouldResolveGcpCliCredentials && this.gcpCliCredentialResolver && gcpAccess) {
        gcpCliCredentials = await this.gcpCliCredentialResolver.resolve({
          request,
          allowedConnectors,
          spaceId: runContext?.spaceId,
          requested: gcpAccess,
          onDiagnostic: (message) => gcpCredentialDiagnostics.push(message),
        });
      }

      if (shouldResolveGcpCliCredentials) {
        recordProgress({
          id: 'gcp-cli-credentials',
          phase: 'credential',
          label: gcpCliCredentials
            ? 'Prepared Google Cloud CLI credentials'
            : 'No Google Cloud CLI credentials prepared',
          status: gcpCliCredentials ? 'completed' : 'failed',
          iconType: 'logoGCP',
          credentialIconVariant: 'secured',
          detail: gcpCliCredentials
            ? `source: ${gcpCliCredentials.source}; project: ${gcpCliCredentials.projectId}`
            : gcpCredentialDiagnostics.length > 0
            ? gcpCredentialDiagnostics.join('; ')
            : 'Unable to resolve a Google Cloud CLI connector for this run',
        });
      }

      if (shouldResolveGitCredentials && this.gitTokenResolver) {
        gitCredentials = await this.gitTokenResolver.resolve({
          request,
          allowedConnectors,
          spaceId: runContext?.spaceId,
          gitRepos: profile?.policy?.git?.repos,
          requestedRepo: requestedGitRepo,
          access: requestedGitAccess,
          requireRequestedRepo: true,
          onDiagnostic: (message) => gitCredentialDiagnostics.push(message),
        });
      }

      // If no connector PAT was found and the profile configures a GitHub App
      // Device Flow, obtain a short-lived user token ("act as me") so the sandbox
      // can read private repos the user has access to (e.g. elastic/*). The
      // interactive "open URL + enter code" step streams into the timeline as a
      // `credential` item. Cached per space, so the user approves at most once.
      const profileWithSecrets = profile as ProfileWithSecrets | undefined;
      const userCredentialSource = this.getUserCredentialSource(profileWithSecrets);
      if (shouldResolveGitCredentials && !gitCredentials && userCredentialSource) {
        // The visible "authorize as me" gesture: confirms the human authorized
        // this run and identifies them in the UI (green credential card).
        const userCred = await userCredentialSource.resolve({
          cacheKey: runContext?.spaceId ?? 'default',
          onProgress: recordProgress,
          abortSignal,
        });
        if (userCred) {
          gitCredentials = {
            token: userCred.token,
            connectorId: userCred.login ? `github-user:${userCred.login}` : 'github-user',
          };
        }
      }

      // Prefer an ephemeral, repo-scoped App *installation* token for the actual
      // git operations (clone/push/PR): least-privilege, auto-expiring, scoped to
      // just the policy's repos. Overrides the user token when available so the
      // sandbox operates with the minimal machine credential, not a broad one.
      if (shouldResolveGitCredentials) {
        const installCred = await this.resolveInstallToken(profileWithSecrets, recordProgress);
        if (installCred) {
          gitCredentials = installCred;
        }
      }

      if (shouldResolveGitCredentials) {
        const githubCredentialsReady = Boolean(gitCredentials && requestedGitRepo);
        const gitCredentialFailure = !gitCredentials
          ? githubCredentialFailureMessage(gitCredentialDiagnostics)
          : !requestedGitRepo
          ? githubCredentialFailureMessage([
              'GitHub credentials were requested, but no specific owner/repo was provided. Ask the user which repository to use.',
              ...gitCredentialDiagnostics,
            ])
          : undefined;
        recordProgress({
          id: 'github-credentials',
          phase: 'credential',
          label: githubCredentialsReady
            ? 'Resolved GitHub credentials'
            : 'No GitHub credentials resolved',
          status: githubCredentialsReady ? 'completed' : 'failed',
          iconType: 'logoGithub',
          credentialIconVariant: 'secured',
          detail: githubCredentialsReady
            ? `${requestedGitRepo ?? 'GitHub'} · ${requestedGitAccess ?? 'unknown access'}`
            : gitCredentialDiagnostics.length > 0
            ? gitCredentialDiagnostics.join('; ')
            : [
                !this.gitTokenResolver ? 'Git token resolver unavailable' : undefined,
                !requestedGitRepo ? 'No GitHub repository was found in the task prompt' : undefined,
                !requestedGitAccess
                  ? 'No git access level could be derived for this run'
                  : undefined,
              ]
                .filter(Boolean)
                .join('; '),
        });
        if (gitCredentialFailure) {
          throw new Error(
            `GitHub credentials are required for this sandbox run, but could not be prepared: ${gitCredentialFailure}`
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
        gitCredentials,
        elasticCliCredentials,
        gcpCliCredentials,
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
      // Model C: keep the sandbox warm for the next turn; release the lease so the
      // idle reaper takes over. Discard only if a fatal error left it unusable.
      if (sandboxAcquired) {
        await stack.registry.release(conversationKey, { discard: fatalSandbox });
      }
    }
  }
}
