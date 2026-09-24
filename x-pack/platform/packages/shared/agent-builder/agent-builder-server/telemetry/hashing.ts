/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_BUILTIN_AGENTS } from '../allow_lists';

const HASH_HEX_LENGTH = 16;
const BUILTIN_AGENT_IDS = new Set<string>([
  agentBuilderDefaultAgentId,
  ...AGENT_BUILDER_BUILTIN_AGENTS,
]);

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Returns the first 16 hex characters of the SHA-256 hash of the given value.
 *
 * Used to normalize identifiers for privacy-preserving telemetry and EIS session ids:
 * the result is stable (same input → same output) and opaque (third parties cannot
 * recover the original value without enumerating the input space).
 */
export function toHashedId(value: string): string {
  return sha256Hex(value).slice(0, HASH_HEX_LENGTH);
}

const CUSTOM_HASH_PREFIX = 'custom-';

/** Stable `custom-<hash>` label used for user-created agent/tool/skill ids. */
export function toCustomHashedId(value: string): string {
  return `${CUSTOM_HASH_PREFIX}${toHashedId(value)}`;
}

/** Built-in agents keep their id; custom agents become `custom-<hash>`. */
export function normalizeAgentIdForTelemetry(agentId?: string): string | undefined {
  if (!agentId) {
    return undefined;
  }
  return BUILTIN_AGENT_IDS.has(agentId) ? agentId : toCustomHashedId(agentId);
}
