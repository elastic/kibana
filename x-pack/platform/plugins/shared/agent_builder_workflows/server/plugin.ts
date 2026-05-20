/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { PluginConfig } from './config';
import type {
  PluginSetupDependencies,
  PluginStartDependencies,
  AgentBuilderWorkflowsPluginSetup,
  AgentBuilderWorkflowsPluginStart,
} from './types';
import { createSafeKibanaRequestRegistry } from './safe_kibana_request_registry';
import { WorkflowsAiTelemetryClient } from './telemetry/workflows_ai_telemetry_client';
import { createWorkflowSmlType } from './sml_types/workflow';
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
import { getWorkflowExecutionStatusTool } from './tools/get_workflow_execution_status';
import { resumeWorkflowExecutionTool } from './tools/resume_workflow_execution';
import { generateWorkflowTool } from './tools/generate_workflow';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export class AgentBuilderWorkflowsPlugin
  implements
    Plugin<
      AgentBuilderWorkflowsPluginSetup,
      AgentBuilderWorkflowsPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  private readonly logger: Logger;
  private api: WorkflowsManagementApi | null = null;

  constructor(context: PluginInitializerContext<PluginConfig>) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderWorkflowsPluginStart>,
    setupDeps: PluginSetupDependencies
  ): AgentBuilderWorkflowsPluginSetup {
    const { agentBuilder, agentContextLayer, workflowsManagement } = setupDeps;
    const api = workflowsManagement.management;
    this.api = api;

    const aiTelemetryClient = new WorkflowsAiTelemetryClient(coreSetup.analytics, this.logger);

    // Registry of `kibana.request` (method, path) pairs that solution plugins
    // have declared read-only and safe to execute without a HITL confirmation
    // dialog (Primitive A). Solution plugins register their paths via
    // `AgentBuilderWorkflowsPluginSetup.registerSafeKibanaRequestPath`.
    const safeKibanaRequestRegistry = createSafeKibanaRequestRegistry();

    // Lazy accessor shared by every tool that needs the workflows-extensions
    // registry. The plugin is declared optional, so the resolver must tolerate
    // it being absent (unit tests, environments without the extension).
    const getWorkflowsExtensions = async () => {
      const [, startDeps] = await coreSetup.getStartServices();
      return startDeps.workflowsExtensions;
    };

    // Workflow tools
    registerValidateWorkflowTool(agentBuilder, api);
    registerGetStepDefinitionsTool(agentBuilder, api, getWorkflowsExtensions);
    registerGetTriggerDefinitionsTool(agentBuilder);
    registerGetConnectorsTool(agentBuilder, api);
    registerGetExamplesTool(agentBuilder);
    registerWorkflowExecuteStepTool(agentBuilder, api, getWorkflowsExtensions, () =>
      safeKibanaRequestRegistry.getPaths()
    );
    registerWorkflowEditTools(agentBuilder, api, aiTelemetryClient);

    // Workflow attachment types
    registerWorkflowYamlAttachment(agentBuilder, api);
    registerWorkflowYamlDiffAttachment(agentBuilder);

    // Workflow authoring skill
    agentBuilder.skills.register(workflowAuthoringSkill);

    // Workflow SML type for the agent context layer
    agentContextLayer.registerType(createWorkflowSmlType(api));

    // Platform-level workflow execution tools
    const platformTools: Array<BuiltinToolDefinition<any>> = [
      getWorkflowExecutionStatusTool({ workflowsManagement }),
      resumeWorkflowExecutionTool({ workflowsManagement }),
      generateWorkflowTool({ workflowsManagement }),
    ];
    platformTools.forEach((tool) => agentBuilder.tools.register(tool));

    return {
      registerSafeKibanaRequestPath:
        safeKibanaRequestRegistry.register.bind(safeKibanaRequestRegistry),
    };
  }

  start(
    coreStart: CoreStart,
    startDeps: PluginStartDependencies
  ): AgentBuilderWorkflowsPluginStart {
    if (this.api) {
      this.api.setSmlIndexAttachment(
        startDeps.agentContextLayer.indexAttachment,
        this.logger.get('sml')
      );
    }
    return {};
  }

  stop() {}
}
