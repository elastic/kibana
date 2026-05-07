/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { registerWorkflowYamlAttachment } from './attachment_types/workflow_yaml_attachment';
import { registerWorkflowYamlDiffAttachment } from './attachment_types/workflow_yaml_diff_attachment';
import { workflowAuthoringSkill } from './skills/workflow_authoring_skill';
import { registerGetConnectorsTool } from './tools/get_connectors_tool';
import { registerGetExamplesTool } from './tools/get_examples_tool';
import { registerGetStepDefinitionsTool } from './tools/get_step_definitions_tool';
import { registerGetTriggerDefinitionsTool } from './tools/get_trigger_definitions_tool';
import { registerValidateWorkflowTool } from './tools/validate_workflow_tool';
import { registerWorkflowEditTools } from './tools/workflow_edit_tools';
import { registerWorkflowExecuteStepTool } from './tools/workflow_execute_step_tool';
import type { WorkflowsAiTelemetryClient } from './telemetry/workflows_ai_telemetry_client';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

interface RegisterWorkflowAgentBuilderIntegrationParams {
  agentBuilder: AgentBuilderPluginSetup;
  logger: Logger;
  api: WorkflowsManagementApi;
  aiTelemetryClient: WorkflowsAiTelemetryClient;
}

export function registerWorkflowAgentBuilderIntegration({
  agentBuilder,
  logger,
  api,
  aiTelemetryClient,
}: RegisterWorkflowAgentBuilderIntegrationParams): void {
  logger.debug('Registering workflow Agent Builder integration components');

  registerValidateWorkflowTool(agentBuilder, api);
  registerGetStepDefinitionsTool(agentBuilder, api);
  registerGetTriggerDefinitionsTool(agentBuilder);
  registerGetConnectorsTool(agentBuilder, api);
  registerGetExamplesTool(agentBuilder);

  registerWorkflowExecuteStepTool(agentBuilder, api);
  registerWorkflowEditTools(agentBuilder, api, aiTelemetryClient);

  registerWorkflowYamlAttachment(agentBuilder, api);
  registerWorkflowYamlDiffAttachment(agentBuilder);

  agentBuilder.skills.register(workflowAuthoringSkill);

  logger.debug('Workflow Agent Builder integration components registered');
}
