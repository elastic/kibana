/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, StaticToolRegistration } from '@kbn/agent-builder-server';
import { productDocumentationTool } from './product_documentation';
import { integrationKnowledgeTool } from './integration_knowledge';
import type { PlatformCoreSetup } from '../start_types';
import { getDocumentByIdTool } from './get_document_by_id';
import { getIndexMappingsTool } from './get_index_mapping';
import { listIndicesTool } from './list_indices';
import { indexExplorerTool } from './index_explorer';
import { generateEsqlTool } from './generate_esql';
import { executeEsqlTool } from './execute_esql';
import { searchTool } from './search';

export const registerTools = ({
  coreSetup,
  agentBuilder,
  organizationId,
  isServerless,
}: {
  coreSetup: PlatformCoreSetup;
  agentBuilder: AgentBuilderPluginSetup;
  /** The cloud organization, where there is a cloud deployment (not in a task pod). */
  organizationId?: string;
  isServerless: boolean;
}) => {
  const tools: Array<StaticToolRegistration<any>> = [
    searchTool({ coreSetup, topSnippetsDefaults: agentBuilder.topSnippets, isServerless }),
    getDocumentByIdTool(),
    executeEsqlTool({ isServerless }),
    generateEsqlTool({
      organizationId,
      isServerless,
    }),
    getIndexMappingsTool({ isServerless }),
    listIndicesTool(),
    indexExplorerTool({ isServerless }),
    productDocumentationTool(coreSetup),
    integrationKnowledgeTool(coreSetup),
  ];

  tools.forEach((tool) => {
    agentBuilder.tools.register(tool);
  });
};
