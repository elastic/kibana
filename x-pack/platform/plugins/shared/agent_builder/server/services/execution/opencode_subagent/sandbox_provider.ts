/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildProcessWithoutNullStreams } from 'child_process';

/**
 * Sandbox abstraction — LAYER 1 of the coding sub-agent stack.
 *
 * A `Sandbox` is pure compute + isolation: "a place I can run a process, exec
 * commands, move files in/out, snapshot, and tear down". It knows NOTHING about
 * agents, ACP, or OpenCode — it just spawns whatever argv you give it and hands
 * back stdio. This is what a user "brings" (local/remote Kubernetes, Cloud Run,
 * E2B, ...).
 *
 * The coding agent (OpenCode + ACP) lives one layer up in `CodingRuntime`, which
 * drives a sandbox via `spawn(argv)` + `putFiles`. Keeping ACP out of here is
 * what lets a Cloud Run sandbox be a drop-in without knowing what OpenCode is.
 *
 * Lifecycle (warm reuse per conversation, idle TTL, snapshot/hydrate) is managed
 * by `SandboxRegistry` on top of this interface, so every provider gets it free.
 *
 * Cloud Run parity: `snapshot`/`hydrate` map onto `--export-tar` / `--import-tar`;
 * `SandboxSpec.egressAllowlist` maps onto `--allow-egress`.
 */

export interface SandboxExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/** Provider capabilities, surfaced to the UI and used to gate policy. */
export interface SandboxCapabilities {
  /** Can produce/consume a portable workspace tar (Model C durability). */
  supportsSnapshot: boolean;
  /** Can enforce an outbound egress allowlist. */
  supportsEgressControl: boolean;
  /** Looks like a local dev environment. */
  isLocal: boolean;
}

/** What a provider needs to stamp out a new sandbox. */
export interface SandboxSpec {
  /** Preferred sandbox id/name (providers may adapt it). */
  name: string;
  /** Container image to run. */
  image: string;
  /** Outbound hosts the sandbox may reach (deny-by-default otherwise). */
  egressAllowlist?: string[];
  /** Extra labels/tags for bookkeeping. */
  labels?: Record<string, string>;
}

export interface SandboxInfo {
  name: string;
  phase: string;
  ready: boolean;
  createdAt?: string;
}

export interface SandboxDescription {
  id: string;
  providerId: string;
  ready: boolean;
  phase: string;
}

/** Provider-neutral environment metadata for the inspector UI. */
export interface SandboxProviderMetadata {
  provider: string;
  /** Human label for the environment (kube context / GCP project / ...). */
  environment: string;
  namespace?: string;
  image: string;
  isLocal: boolean;
  clientVersion?: string;
  serverVersion?: string;
  serverUrl?: string;
  nodes?: string[];
  error?: string;
}

/**
 * A running sandbox instance. Compute-only; no agent/ACP knowledge.
 * Implementations MUST be safe to use concurrently across different instances.
 */
export interface Sandbox {
  /** Stable id (pod name for kube, instance id for others). */
  readonly id: string;
  /** Which provider owns this sandbox (for routing exec/logs back). */
  readonly providerId: string;

  /** Run a process; caller drives its stdio (used to launch the coding agent). */
  spawn(
    argv: string[],
    opts?: { cwd?: string; env?: Record<string, string> }
  ): ChildProcessWithoutNullStreams;

  /** Execute an arbitrary shell command and collect its result. */
  exec(command: string, opts?: { timeoutMs?: number }): Promise<SandboxExecResult>;

  /** Write files into the sandbox (e.g. the coding agent's config). */
  putFiles(files: Array<{ path: string; contents: string }>): Promise<void>;

  /** Follow stdout logs (best-effort; provider dependent). */
  streamLogs(opts?: { tailLines?: number }): ChildProcessWithoutNullStreams;

  /** Export the durable workspace to a portable tar (base64). Cloud Run: export-tar. */
  snapshot(): Promise<string | undefined>;

  /** Restore a workspace tar (base64) produced by snapshot(). Cloud Run: import-tar. */
  hydrate(tarBase64: string): Promise<void>;

  describe(): Promise<SandboxDescription>;

  /** Tear down this sandbox. Never throws. */
  stop(): Promise<void>;
}

/**
 * Creates and enumerates sandboxes for one backend (local k8s today; Cloud Run,
 * remote k8s, E2B, ... later). The thing a user "brings" and attaches to an agent.
 */
export interface SandboxProvider {
  readonly id: string; // 'local-k8s' | 'cloud-run' | ...
  readonly displayName: string;
  readonly capabilities: SandboxCapabilities;

  /** Provision a sandbox and wait until it is ready to accept exec/spawn. */
  create(spec: SandboxSpec): Promise<Sandbox>;

  /** Reattach to an already-running sandbox by id (warm reuse across turns). */
  get(id: string): Promise<Sandbox | undefined>;

  /** List sandboxes this provider currently owns. */
  list(): Promise<SandboxInfo[]>;

  /** Reap sandboxes left over from a previous process. Never throws. */
  sweepOrphans(): Promise<void>;

  /** Environment metadata for the inspector UI. */
  getMetadata(): Promise<SandboxProviderMetadata>;
}
