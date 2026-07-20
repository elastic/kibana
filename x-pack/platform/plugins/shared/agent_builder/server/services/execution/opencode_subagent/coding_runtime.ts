/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Sandbox } from './sandbox_provider';
import type { OpencodeRunProgress } from './types';

/**
 * Coding runtime abstraction — LAYER 2 of the coding sub-agent stack.
 *
 * A `CodingRuntime` is the "agent that runs inside a sandbox" — today OpenCode
 * driven over ACP. It knows how to lay down its own config, launch itself via
 * `sandbox.spawn(argv)`, speak its agent protocol, and emit a UI activity
 * timeline. It does NOT know how the sandbox is provisioned or reused — it just
 * receives a ready `Sandbox`.
 *
 * The interface is deliberately runtime-neutral so other coding agents
 * (Claude Code, Gemini CLI, ...) can be added later without touching the
 * sandbox or lifecycle layers. For now only `OpenCodeAcpRuntime` implements it.
 */

/** Model routing for the coding agent (via LiteLLM or any OpenAI-compatible base). */
export interface RuntimeModelConfig {
  baseUrl: string;
  apiKey?: string;
  orchestratorModel: string;
  coderModel: string;
}

/**
 * How the sandboxed agent reaches Kibana tools/connectors. Secrets never enter
 * the sandbox: it holds only a short-lived, privilege-scoped credential and
 * calls back into the Agent Builder MCP server, which brokers connector calls
 * server-side (Kibana's actions framework is the credential broker).
 */
export interface RuntimeToolAccess {
  /** Agent Builder MCP endpoint the sandbox calls back into. */
  mcpUrl: string;
  /** `Authorization` header value (per-run scoped API key). */
  mcpAuthHeader: string;
  /**
   * Connector ids the run is allowed to use (from the sandbox policy). Used to
   * scope the MCP tool surface and to compose the system prompt's tool catalog.
   * Empty/undefined means "whatever the scoped credential's RBAC permits".
   */
  allowedConnectors?: string[];
}

export interface CodingRunParams {
  /** A ready, isolated sandbox to run the agent in. */
  sandbox: Sandbox;
  /** The task for the coding agent. */
  prompt: string;
  modelConfig: RuntimeModelConfig;
  toolAccess: RuntimeToolAccess;
  /**
   * Dynamically composed system/agent instructions (e.g. which connectors are
   * available and how to call them, guardrails). Composed per run so it reflects
   * exactly what the scoped credential permits.
   */
  systemPrompt?: string;
  /**
   * GitHub credentials for real git operations (clone/push/PR) inside the
   * sandbox. Injected into the pod's git per-run and scrubbed afterwards. Unlike
   * MCP-brokered API calls, raw git needs a git-usable credential in the pod, so
   * this is a deliberate, narrowly-scoped exception to "no secrets in sandbox".
   */
  gitCredentials?: GitCredentials;
  /**
   * Elastic CLI config for first-party Kibana/Elasticsearch access. Injected as
   * a per-run config file and scrubbed afterwards.
   */
  elasticCliCredentials?: ElasticCliCredentials;
  /**
   * Google Cloud CLI config for connector-backed sandbox access. Injected as
   * per-run files and scrubbed afterwards.
   */
  gcpCliCredentials?: GcpCliCredentials;
  /** Max wall-clock for the agent turn. */
  timeoutMs: number;
  /** Streaming activity for the parent agent/UI. */
  onProgress?: (progress: OpencodeRunProgress) => void;
  abortSignal?: AbortSignal;
}

/** A short-lived, minimally-scoped credential for git operations in the sandbox. */
export interface GitCredentials {
  /** GitHub token (PAT) used as the `x-access-token` password over HTTPS. */
  token: string;
  /** The connector this token came from (for logging/correlation). */
  connectorId: string;
}

export interface ElasticCliCredentials {
  /** Contents of `.elasticrc.yml`. */
  configYml: string;
  /** Human-readable source for logging/timeline diagnostics. */
  source: string;
}

export interface GcpCliCredentials {
  /** Service account JSON used by the POC gcloud setup path. */
  serviceAccountJson: string;
  /** GCP project configured as the default gcloud project. */
  projectId: string;
  /** Human-readable source for logging/timeline diagnostics. */
  source: string;
}

export interface CodingRunResult {
  answer: string;
  stopReason?: string;
  timeline: OpencodeRunProgress[];
  /** Raw tool titles the agent invoked (debugging / power users). */
  toolCalls: string[];
}

export interface CodingRuntime {
  /** Short id, e.g. 'opencode' or 'pi'. */
  readonly id: string;
  /**
   * Wire protocol the runtime speaks: 'acp' (opencode, streamed) or 'print'
   * (pi, one-shot per turn via `pi --print`).
   */
  readonly protocol: 'acp' | 'print';

  /**
   * Run one turn of the coding agent inside the given (ready) sandbox. The
   * runtime writes its config, launches itself, drives the protocol, and returns
   * the final answer + activity timeline. It MUST NOT stop/tear down the sandbox
   * (the lifecycle layer owns that).
   */
  run(params: CodingRunParams): Promise<CodingRunResult>;
}
