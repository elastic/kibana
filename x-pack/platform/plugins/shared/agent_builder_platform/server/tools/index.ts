/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { productDocumentationTool } from './product_documentation';
import { integrationKnowledgeTool } from './integration_knowledge';
import type {
  AgentBuilderPlatformPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from '../types';
import { casesTool } from './cases/cases';
import { getDocumentByIdTool } from './get_document_by_id';
import { getIndexMappingsTool } from './get_index_mapping';
import { listIndicesTool } from './list_indices';
import { indexExplorerTool } from './index_explorer';
import { generateEsqlTool } from './generate_esql';
import { executeEsqlTool } from './execute_esql';
import { searchTool } from './search';
import { createVisualizationTool } from './create_visualization';
import { getWorkflowExecutionStatusTool } from './get_workflow_execution_status';
import { listWorkflowsTool } from './list_workflows';
import { getWorkflowTool } from './get_workflow';
import { runWorkflowTool } from './run_workflow';
import { getWorkflowExecutionLogsTool } from './get_workflow_execution_logs';
import { savedObjectsTool } from './saved_objects/saved_objects';
import { dataViewsTool } from './data_views/data_views';
import { alertingRulesTool } from './alerting/alerting_rules';
import { connectorsTool } from './connectors/connectors';
import { uiSettingsTool } from './ui_settings';
import { spacesTool } from './spaces';
import { privilegesTool } from './privileges';
import { tagsTool } from './tags/tags';

export const registerTools = ({
  coreSetup,
  setupDeps,
}: {
  coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>;
  setupDeps: PluginSetupDependencies;
}) => {
  const { onechat } = setupDeps;

  const tools: Array<BuiltinToolDefinition<any>> = [
    searchTool(),
    getDocumentByIdTool(),
    executeEsqlTool(),
    generateEsqlTool(),
    getIndexMappingsTool(),
    listIndicesTool(),
    indexExplorerTool(),
    createVisualizationTool(),
    productDocumentationTool(coreSetup),
    integrationKnowledgeTool(coreSetup),
    casesTool(coreSetup),
    savedObjectsTool({ coreSetup }),
    dataViewsTool({ coreSetup }),
    alertingRulesTool({ coreSetup }),
    connectorsTool({ coreSetup }),
    uiSettingsTool({ coreSetup }),
    spacesTool({ coreSetup }),
    privilegesTool({ coreSetup }),
    tagsTool({ coreSetup }),
  ];

  if (setupDeps.workflowsManagement) {
    tools.push(
      getWorkflowExecutionStatusTool({ workflowsManagement: setupDeps.workflowsManagement }),
      listWorkflowsTool({ workflowsManagement: setupDeps.workflowsManagement }),
      getWorkflowTool({ workflowsManagement: setupDeps.workflowsManagement }),
      runWorkflowTool({ workflowsManagement: setupDeps.workflowsManagement }),
      getWorkflowExecutionLogsTool({ workflowsManagement: setupDeps.workflowsManagement })
    );
  }

  tools.forEach((tool) => {
    onechat.tools.register(tool);
  });
};
