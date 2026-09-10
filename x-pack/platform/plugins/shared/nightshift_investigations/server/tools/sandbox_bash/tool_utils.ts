/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentConfiguration } from '@kbn/agent-builder-common';
import type { RunContextStackEntry } from '@kbn/agent-builder-server';

export const getConversationId = (context: {
  runContext: { stack: unknown[] };
}): string | undefined =>
  (context.runContext.stack as RunContextStackEntry[])
    .filter((e) => e.type === 'agent')
    .map((e) => (e as Extract<RunContextStackEntry, { type: 'agent' }>).conversationId)
    .find(Boolean);

/**
 * Resolve a file path to an absolute path inside the sandbox.
 * Relative paths are anchored to /workspace (the default sandbox working dir).
 */
export const resolveAbsolutePath = (filePath: string): string => {
  if (filePath.startsWith('/') || filePath.startsWith('~')) return filePath;
  return `/workspace/${filePath}`;
};

export interface SandboxCallContext {
  request: KibanaRequest;
  /** Per-agent connector allow-list; credentials are never injected for connectors outside it. */
  allowedConnectorIds: readonly string[];
}

export const getSandboxCallContext = (context: {
  request: KibanaRequest;
  agentConfiguration?: AgentConfiguration;
}): SandboxCallContext => ({
  request: context.request,
  allowedConnectorIds: context.agentConfiguration?.connector_ids ?? [],
});
