/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { AiIndexService } from '../ai_indices/service';
import type { WorkflowsManagementApiLike } from '../types';
import { contextEngineAgent } from './agent/context_engine_agent';
import { createAiIndexAttachmentType } from './attachments/ai_index_attachment_type';
import { createCaseAttachmentType } from './attachments/case_attachment_type';
import { createPatternAttachmentType } from './attachments/pattern_attachment_type';
import { contextEngineSetupSkill } from './skills/context_engine_setup/context_engine_setup_skill';
import { proposeImprovementSkill } from './skills/propose_improvement/propose_improvement_skill';
import { getAiIndexTool } from './tools/get_ai_index';
import { saveAutomationTool } from './tools/save_automation';
import { updateAiIndexTool } from './tools/update_ai_index';

/**
 * Registers the Context Engine's agent-builder surface: the management agent,
 * its tools, the AI-index + pattern attachments, and the setup / propose-improvement
 * skills. `save_automation` is registered even when workflows are unavailable; it
 * returns an error result at call time in that case.
 */
export const registerContextEngineAgentBuilder = ({
  agentBuilder,
  getAiIndexService,
  getWorkflowsApi,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getAiIndexService: () => AiIndexService;
  getWorkflowsApi: () => WorkflowsManagementApiLike | undefined;
}) => {
  agentBuilder.tools.register(getAiIndexTool({ getAiIndexService }));
  agentBuilder.tools.register(updateAiIndexTool({ getAiIndexService }));
  agentBuilder.tools.register(saveAutomationTool({ getAiIndexService, getWorkflowsApi }));

  // The registry accepts the base `AttachmentTypeDefinition<string, unknown>`; our
  // definitions are narrowed to their concrete payload types, which are not assignable
  // through the (contravariant) `validate`/`format` methods — widen at the boundary.
  agentBuilder.attachments.registerType(
    createAiIndexAttachmentType({ getAiIndexService, getWorkflowsApi }) as AttachmentTypeDefinition
  );
  agentBuilder.attachments.registerType(createPatternAttachmentType() as AttachmentTypeDefinition);
  agentBuilder.attachments.registerType(createCaseAttachmentType() as AttachmentTypeDefinition);

  agentBuilder.skills.register(contextEngineSetupSkill);
  agentBuilder.skills.register(proposeImprovementSkill);

  agentBuilder.agents.register(contextEngineAgent);
};
