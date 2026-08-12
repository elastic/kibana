/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { WorkflowsManagementApiLike } from '../types';
import { createAiIndexAttachmentType } from './attachments/ai_index_attachment_type';

/**
 * Registers the Context Engine's Agent Builder data-access surface: ONLY the neutral `ai_index`
 * attachment and its read-only `get_ai_index_automations` bounded tool. No built-in agent and no
 * skills — the feedback-loop analysis agent is the user's own (selected per AI index via
 * `feedback_agent_id`; the chat bridge opens that agent with the index attached).
 *
 * This module — and everything under `server/agent_builder/` — is NEVER imported by
 * `context_engine`'s own `plugin.ts`/`index.ts` load path against `agentBuilder`. It is called
 * exclusively from `agent_builder_platform`'s server `setup()` (which depends on `agentBuilder`),
 * which passes `getWorkflowsApi` from `context_engine`'s setup contract and a `getCapabilities`
 * resolver from its own core. This is the server half of the dependency-inversion bridge.
 */
export const registerContextEngineAgentBuilder = ({
  agentBuilder,
  getWorkflowsApi,
  getCapabilities,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getWorkflowsApi: () => WorkflowsManagementApiLike | undefined;
  /** Resolves the caller's capabilities so the read tool can enforce the workflows-read privilege. */
  getCapabilities: (request: KibanaRequest) => Promise<Capabilities>;
}): void => {
  // The registry's `AttachmentTypeDefinition` is more generic (`<string, unknown>`) than the
  // factory's specific `<Type, Payload>`; cast at the boundary (contravariant `validate`/`format`
  // inputs won't widen implicitly) rather than loosen the factory's return type.
  agentBuilder.attachments.registerType(
    createAiIndexAttachmentType({ getWorkflowsApi, getCapabilities }) as AttachmentTypeDefinition
  );
};
