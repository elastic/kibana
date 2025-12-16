/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import {
  AGENT_BUILDER_BUILTIN_AGENTS,
  AGENT_BUILDER_BUILTIN_TOOLS,
} from '@kbn/onechat-server/allow_lists';

const BUILTIN_AGENT_IDS = new Set([oneChatDefaultAgentId, ...AGENT_BUILDER_BUILTIN_AGENTS]);
const BUILTIN_TOOL_IDS = new Set(AGENT_BUILDER_BUILTIN_TOOLS);

const CUSTOM = 'custom';

/**
 * Normalizes agent IDs for telemetry to protect user privacy.
 * Built-in agents are reported with their actual ID, custom agents are reported as CUSTOM.
 */
export function normalizeAgentIdForTelemetry(agentId?: string): string | undefined {
  if (!agentId) {
    return undefined;
  }
  return BUILTIN_AGENT_IDS.has(agentId) ? agentId : CUSTOM;
}

/**
 * Normalizes tool IDs for telemetry to protect user privacy.
 * Built-in tools (from AGENT_BUILDER_BUILTIN_TOOLS) are reported with their actual ID,
 * custom/user-created tools are reported as CUSTOM.
 */
export function normalizeToolIdForTelemetry(toolId: string): string {
  return BUILTIN_TOOL_IDS.has(toolId) ? toolId : CUSTOM;
}
