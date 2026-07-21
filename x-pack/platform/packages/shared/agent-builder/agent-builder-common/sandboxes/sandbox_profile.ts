/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A Sandbox Profile is what a user "brings" and attaches to an agent to give it
 * a coding sub-agent: a (compute) provider + an (ACP) runtime + a policy.
 *
 * Two layers, kept intentionally separate:
 *
 * - `provider` is the isolated compute backend and its `connection` (WHERE code
 *   runs + how to reach it): local Kubernetes today, Cloud Run agent sandboxes
 *   today, remote k8s / E2B later.
 * - `runtime` + `runtimeConfig` is the coding agent that runs INSIDE the sandbox
 *   and how it routes models (WHAT runs): OpenCode today.
 *
 * Connection details that are secrets (a remote kubeconfig, a GCP service
 * account key, ...) are stored as an Encrypted Saved Object and never returned
 * to the browser. Local Kubernetes needs no secret (just a kube-context name);
 * Cloud Run needs a service-account key (a secret) + a bridge URL (not secret).
 */

export type SandboxProviderId = 'local-k8s' | 'cloud-run';
export type SandboxRuntimeId = 'opencode' | 'pi';

/** Local Kubernetes (kind/minikube/...): non-secret, just a context + image. */
export interface LocalK8sConnection {
  type: 'local-k8s';
  /** kube-context name (as in `kubectl config get-contexts`). */
  kubeContext: string;
  namespace: string;
  /** Container image the sandbox runs. */
  image: string;
}

/**
 * Cloud Run agent sandboxes. The `sandbox` CLI only exists inside a Cloud Run
 * service deployed with `--sandbox-launcher`, so Kibana reaches it through a
 * small bridge service (the ComputeSDK / ZenML pattern). `bridgeUrl` and
 * `project`/`region` are non-secret; the service-account key lives in `secrets`.
 */
export interface CloudRunConnection {
  type: 'cloud-run';
  /** GCP project id (for display + metadata; the bridge enforces it). */
  project: string;
  /** GCP region the bridge is deployed in (e.g. us-central1). */
  region: string;
  /** HTTPS URL of the deployed bridge service (…run.app). */
  bridgeUrl: string;
  /**
   * Cloud Run IAM audience for the ID token. Usually equals `bridgeUrl`. If the
   * bridge allows unauthenticated invocations (dev), leave empty to skip auth.
   */
  audience?: string;
}

export type SandboxConnection = LocalK8sConnection | CloudRunConnection;

/**
 * Capability tier: a named preset over the four permission axes below. The tier
 * is the primary knob users pick; advanced users override individual axes. It
 * exists so the default is least-privilege and escalation is an explicit choice
 * (unlike "let the agent do everything"). Ordered least → most privileged:
 *
 * - `restricted`  — ephemeral FS, deny-all egress (except model gateway + MCP
 *   loopback), no connectors, no git. "Run a snippet."
 * - `investigate` — + egress allowlist, read-only clone, read-only connectors.
 *   No writes anywhere. (the abusedb/checkIp demo)
 * - `contribute`  — + push branch / open PR (broker-scoped token) + write
 *   connectors. The "wow" tier.
 * - `trusted`     — open egress, full capability. Local/single-tenant dev only.
 */
export type SandboxTier = 'restricted' | 'investigate' | 'contribute' | 'trusted';

/** Filesystem posture inside the sandbox. */
export type SandboxFilesystemMode = 'ephemeral-ro' | 'ephemeral-rw';

/** Network egress posture. */
export type SandboxEgressMode = 'deny' | 'allowlist' | 'open';

/** How the sandbox's runtime may use Kibana connectors (enforced by the broker). */
export type SandboxConnectorAccess = 'none' | 'read' | 'write';

/** Git/repo capability (enforced by the broker's scoped git credential). */
export interface SandboxGitPolicy {
  mode: 'none' | 'clone-ro' | 'push-pr';
  /** Repos this sandbox may touch (owner/repo). Empty = none (or all if trusted). */
  repos?: string[];
}

/** Lifecycle + capability policy for sandboxes created from this profile. */
export interface SandboxPolicy {
  /** Named preset over the capability axes; the axes below may override it. */
  tier?: SandboxTier;

  // ---- Lifecycle ---------------------------------------------------------
  /** Reap a warm sandbox after this much inactivity in a conversation. */
  idleTtlMs: number;
  /** Hard cap on a sandbox's lifetime regardless of activity. */
  maxLifetimeMs: number;
  /** Max wall-clock for a single coding turn. */
  maxRunSeconds: number;

  // ---- Axis 1: compute (enforced by the SandboxProvider) -----------------
  /** Filesystem posture. Defaults to ephemeral-rw. */
  filesystem?: SandboxFilesystemMode;
  /** Whether arbitrary shell is allowed. Defaults to true. */
  allowShell?: boolean;

  // ---- Axis 2: network (enforced by the SandboxProvider) -----------------
  /** Egress posture. Defaults to `allowlist` when an allowlist is present. */
  egress?: SandboxEgressMode;
  /** Outbound hosts the sandbox may reach (used when egress = 'allowlist'). */
  egressAllowlist?: string[];

  // ---- Axis 3: Kibana data/tools (enforced by the broker) ----------------
  /** How the runtime may use connectors. Defaults to `read`. */
  connectorAccess?: SandboxConnectorAccess;
  /** Connector ids the sandbox's runtime may use (empty = the user's RBAC). */
  allowedConnectors?: string[];

  // ---- Axis 4: git/repo (enforced by the broker) -------------------------
  /** Git capability + repo scope. Defaults to clone-ro. */
  git?: SandboxGitPolicy;
}

/**
 * The capability axes each tier implies. Advanced overrides are merged on top.
 * Lifecycle fields (TTLs) are orthogonal and not part of the preset.
 */
export const SANDBOX_TIER_PRESETS: Record<
  SandboxTier,
  Required<Pick<SandboxPolicy, 'filesystem' | 'allowShell' | 'egress' | 'connectorAccess'>> & {
    git: SandboxGitPolicy;
  }
> = {
  restricted: {
    filesystem: 'ephemeral-rw',
    allowShell: true,
    egress: 'deny',
    connectorAccess: 'none',
    git: { mode: 'none' },
  },
  investigate: {
    filesystem: 'ephemeral-rw',
    allowShell: true,
    egress: 'allowlist',
    connectorAccess: 'read',
    git: { mode: 'clone-ro' },
  },
  contribute: {
    filesystem: 'ephemeral-rw',
    allowShell: true,
    egress: 'allowlist',
    connectorAccess: 'write',
    git: { mode: 'push-pr' },
  },
  trusted: {
    filesystem: 'ephemeral-rw',
    allowShell: true,
    egress: 'open',
    connectorAccess: 'write',
    git: { mode: 'push-pr' },
  },
};

/**
 * Resolve the effective capability axes for a policy: start from the tier preset
 * (default `investigate`), then apply any explicit per-axis overrides. Callers
 * (resolver, providers, broker) use this so tier and overrides can't disagree.
 */
export const resolveSandboxCapabilities = (
  policy: SandboxPolicy
): Required<Pick<SandboxPolicy, 'filesystem' | 'allowShell' | 'egress' | 'connectorAccess'>> & {
  git: SandboxGitPolicy;
  egressAllowlist?: string[];
  allowedConnectors?: string[];
} => {
  const preset = SANDBOX_TIER_PRESETS[policy.tier ?? 'investigate'];
  return {
    filesystem: policy.filesystem ?? preset.filesystem,
    allowShell: policy.allowShell ?? preset.allowShell,
    egress: policy.egress ?? preset.egress,
    egressAllowlist: policy.egressAllowlist,
    connectorAccess: policy.connectorAccess ?? preset.connectorAccess,
    allowedConnectors: policy.allowedConnectors,
    git: policy.git ?? preset.git,
  };
};

/** Runtime (coding agent) configuration — model routing for OpenCode. */
export interface OpencodeRuntimeConfig {
  type: 'opencode';
  /** OpenAI-compatible base URL (e.g. LiteLLM). */
  baseUrl: string;
  orchestratorModel: string;
  coderModel: string;
}

/**
 * Runtime config for pi (github.com/earendil-works/pi). pi speaks its own
 * protocol (not ACP); for the PoC it is driven one-shot per turn via
 * `pi --print` / `--mode json`. A single `model` routes through the same
 * OpenAI-compatible gateway.
 */
export interface PiRuntimeConfig {
  type: 'pi';
  /** OpenAI-compatible base URL (e.g. LiteLLM). */
  baseUrl: string;
  model: string;
}

export type SandboxRuntimeConfig = OpencodeRuntimeConfig | PiRuntimeConfig;

/** A profile as returned to the UI (no secrets). */
export interface SandboxProfile {
  id: string;
  name: string;
  description?: string;
  provider: SandboxProviderId;
  runtime: SandboxRuntimeId;
  connection: SandboxConnection;
  runtimeConfig: SandboxRuntimeConfig;
  policy: SandboxPolicy;
  createdAt?: string;
  updatedAt?: string;
}

export type SandboxProfileCreateRequest = Omit<SandboxProfile, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  /** Secret connection material (e.g. kubeconfig/SA key) for secret providers. */
  secrets?: Record<string, string>;
};

export type SandboxProfileUpdateRequest = Partial<
  Omit<SandboxProfile, 'id' | 'createdAt' | 'updatedAt' | 'provider' | 'runtime'>
> & {
  secrets?: Record<string, string>;
};

/** Sensible defaults for a new profile (mirrors the previous hardcoded config). */
export const DEFAULT_SANDBOX_POLICY: SandboxPolicy = {
  tier: 'investigate',
  idleTtlMs: 20 * 60 * 1000,
  maxLifetimeMs: 2 * 60 * 60 * 1000,
  maxRunSeconds: 1800,
};

/** Well-known secret key holding a GCP service-account JSON for Cloud Run. */
export const CLOUD_RUN_SA_SECRET_KEY = 'gcpServiceAccountKey';
