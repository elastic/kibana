/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  AGENT_BUILDER_BUILTIN_AGENTS,
  AGENT_BUILDER_BUILTIN_TOOLS,
} from '@kbn/agent-builder-server/allow_lists';
import { createHash } from 'crypto';

const BUILTIN_AGENT_IDS = new Set([agentBuilderDefaultAgentId, ...AGENT_BUILDER_BUILTIN_AGENTS]);
const BUILTIN_TOOL_IDS = new Set(AGENT_BUILDER_BUILTIN_TOOLS);

const CUSTOM = 'custom';
const CUSTOM_HASH_PREFIX = `${CUSTOM}-`;
const CUSTOM_HASH_HEX_LENGTH = 16;

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function toCustomHashedId(value: string): string {
  return `${CUSTOM_HASH_PREFIX}${sha256Hex(value).slice(0, CUSTOM_HASH_HEX_LENGTH)}`;
}

/**
 * Normalizes agent IDs for telemetry to protect user privacy.
 * Built-in agents are reported with their actual ID, custom agents are reported as a stable hashed
 * label (CUSTOM-<sha256_prefix>).
 */
export function normalizeAgentIdForTelemetry(agentId?: string): string | undefined {
  if (!agentId) {
    return undefined;
  }
  return BUILTIN_AGENT_IDS.has(agentId) ? agentId : toCustomHashedId(agentId);
}

/**
 * Normalizes tool IDs for telemetry to protect user privacy.
 * Built-in tools (from AGENT_BUILDER_BUILTIN_TOOLS) are reported with their actual ID,
 * custom/user-created tools are reported as a stable hashed label (CUSTOM-<sha256_prefix>).
 */
export function normalizeToolIdForTelemetry(toolId: string): string {
  return (BUILTIN_TOOL_IDS as Set<string>).has(toolId) ? toolId : toCustomHashedId(toolId);
}
