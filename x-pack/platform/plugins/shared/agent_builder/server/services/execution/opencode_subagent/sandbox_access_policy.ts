/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SandboxPolicy } from '@kbn/agent-builder-common';
import { resolveSandboxCapabilities } from '@kbn/agent-builder-common';

/**
 * Pure policy decisions for what a sandboxed coding sub-agent is allowed to do.
 *
 * This is the enforcement seam between our layer (which owns `SandboxPolicy` and
 * its capability tiers) and the credential broker (which owns the actual token
 * minting + connector execution). The broker calls these functions to decide,
 * per run, whether to hand out a git credential and whether a connector action
 * is permitted — so the tier the user picked in the UI is actually enforced,
 * rather than "resolve a token whenever one exists".
 *
 * Everything here is a pure function of the policy (+ inputs); no I/O, no
 * secrets. Fail-safe: an undefined policy resolves to the least-privilege
 * defaults via `resolveSandboxCapabilities`.
 */

/** Whether this run may obtain a git credential at all, and at what capability. */
export interface GitAccessDecision {
  /** Allowed to touch git at all (mode !== 'none'). */
  allowed: boolean;
  /** Effective git mode from the policy tier + overrides. */
  mode: 'none' | 'clone-ro' | 'push-pr';
  /** Whether push / open-PR is permitted (mode === 'push-pr'). */
  canPush: boolean;
  /** Repos the run may touch (owner/repo). Empty = no per-repo restriction declared. */
  repos: string[];
}

/**
 * Decide the git capability for a run from its sandbox policy. The broker's
 * GitHub token resolver should call this BEFORE minting/resolving a token and:
 *   - skip resolution entirely when `!allowed`,
 *   - request a read-only-scoped token when `!canPush`,
 *   - reject repos not in `repos` when it is non-empty.
 */
export const decideGitAccess = (policy?: SandboxPolicy): GitAccessDecision => {
  const caps = resolveSandboxCapabilities(policy ?? ({} as SandboxPolicy));
  const mode = caps.git.mode;
  return {
    allowed: mode !== 'none',
    mode,
    canPush: mode === 'push-pr',
    repos: caps.git.repos ?? [],
  };
};

/** Whether a specific repo is permitted by the policy's repo allowlist. */
export const isRepoAllowed = (policy: SandboxPolicy | undefined, repo: string): boolean => {
  const { repos } = decideGitAccess(policy);
  if (repos.length === 0) return true; // no allowlist declared → not restricted here
  return repos.includes(repo);
};

/** Decision for whether a connector (and access level) may be used from the sandbox. */
export interface ConnectorAccessDecision {
  /** Connector access level the run is allowed: none | read | write. */
  level: 'none' | 'read' | 'write';
  /** Whether any connector use is permitted (level !== 'none'). */
  allowed: boolean;
  /** Whether write (mutating) connector actions are permitted. */
  canWrite: boolean;
  /** Connector ids the run may use. Empty = defer to the scoped credential's RBAC. */
  allowedConnectors: string[];
}

/**
 * Decide connector access for a run from its sandbox policy. The broker's
 * connector RPC (`execute_connector`) should call this to gate calls:
 *   - reject when `!allowed`,
 *   - reject write-class actions when `!canWrite`,
 *   - reject connector ids not in `allowedConnectors` when it is non-empty.
 *
 * The read/write class of an action comes from the connector spec
 * (`getSandboxActionAccess` in `@kbn/connector-specs`); this function decides
 * only what the *policy* permits, independent of any specific connector.
 */
export const decideConnectorAccess = (policy?: SandboxPolicy): ConnectorAccessDecision => {
  const caps = resolveSandboxCapabilities(policy ?? ({} as SandboxPolicy));
  const level = caps.connectorAccess;
  return {
    level,
    allowed: level !== 'none',
    canWrite: level === 'write',
    allowedConnectors: caps.allowedConnectors ?? [],
  };
};

/**
 * Whether a connector action of the given access class is permitted by the
 * policy. `actionAccess` is the connector-spec classification of the action.
 */
export const isConnectorActionAllowed = (
  policy: SandboxPolicy | undefined,
  connectorId: string,
  actionAccess: 'read' | 'write'
): boolean => {
  const decision = decideConnectorAccess(policy);
  if (!decision.allowed) return false;
  if (actionAccess === 'write' && !decision.canWrite) return false;
  if (decision.allowedConnectors.length > 0 && !decision.allowedConnectors.includes(connectorId)) {
    return false;
  }
  return true;
};
