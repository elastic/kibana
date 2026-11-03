/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { WorkflowsAiTelemetryClient } from './telemetry/workflows_ai_telemetry_client';
import { registerWorkflowYamlAttachment } from './attachment_types/workflow_yaml_attachment';
import { registerWorkflowYamlDiffAttachment } from './attachment_types/workflow_yaml_diff_attachment';
import { workflowAuthoringSkill } from './skills/workflow_authoring_skill';
import { registerGetConnectorsTool } from './tools/get_connectors_tool';
import { registerGetExamplesTool } from './tools/get_examples_tool';
import { registerGetStepDefinitionsTool } from './tools/get_step_definitions_tool';
import { registerGetTriggerDefinitionsTool } from './tools/get_trigger_definitions_tool';
import { registerGetWorkflowTool } from './tools/get_workflow_tool';
import { registerValidateWorkflowTool } from './tools/validate_workflow_tool';
import { registerWorkflowExecuteStepTool } from './tools/workflow_execute_step_tool';
import { getWorkflowExecutionStatusTool } from './tools/get_workflow_execution_status';
import { listWorkflowExecutionsTool } from './tools/list_workflow_executions';
import { resumeWorkflowExecutionTool } from './tools/resume_workflow_execution';
import { generateWorkflowTool } from './tools/generate_workflow';
import { executeWorkflowTool } from './tools/execute_workflow';

/**
 * Registers the workflow tools, attachment types and the authoring skill into agent builder. The one
 * runtime behind Kibana's `server` entry and the task pod's `server/tasks` entry, which differ in
 * where workflows management and the security privilege checks come from.
 */
export const registerAgentBuilderWorkflows = ({
  agentBuilder,
  workflowsManagement,
  getSecurity,
  aiTelemetryClient,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
  getSecurity: () => SecurityPluginStart | undefined;
  aiTelemetryClient: WorkflowsAiTelemetryClient;
}): void => {
  const api = workflowsManagement.management;

  // Workflow tools
  registerValidateWorkflowTool(agentBuilder, api);
  registerGetWorkflowTool(agentBuilder, api, getSecurity);
  registerGetStepDefinitionsTool(agentBuilder, api);
  registerGetTriggerDefinitionsTool(agentBuilder, api);
  registerGetConnectorsTool(agentBuilder, api);
  registerGetExamplesTool(agentBuilder);
  registerWorkflowExecuteStepTool(agentBuilder, api, getSecurity);

  // Workflow attachment types
  registerWorkflowYamlAttachment(agentBuilder, api, getSecurity);
  registerWorkflowYamlDiffAttachment(agentBuilder);

  // Workflow authoring skill
  agentBuilder.skills.register(workflowAuthoringSkill);

  // Platform-level workflow execution tools
  const platformTools: Array<BuiltinToolDefinition<any>> = [
    getWorkflowExecutionStatusTool({ workflowsManagement, getSecurity }),
    resumeWorkflowExecutionTool({ workflowsManagement, getSecurity }),
    listWorkflowExecutionsTool({ workflowsManagement, getSecurity }),
    generateWorkflowTool({ workflowsManagement, aiTelemetryClient }),
    executeWorkflowTool({ workflowsManagement, getSecurity }),
  ];
  platformTools.forEach((tool) => agentBuilder.tools.register(tool));
};
