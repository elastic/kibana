/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { AnyToolTypeDefinition } from './definitions';
import { getEsqlToolType } from './esql';
import { getIndexSearchToolType, type IndexSearchToolTypeDeps } from './index_search';
import { getWorkflowToolType } from './workflow';
import { getBuiltinToolType } from './builtin';
import { getMcpToolType } from './mcp';

export const getToolTypeDefinitions = ({
  workflowsManagement,
  security,
  actions,
  indexSearchDeps,
}: {
  workflowsManagement?: WorkflowsServerPluginSetup;
  security: SecurityPluginStart | undefined;
  actions: ActionsPluginStart;
  indexSearchDeps: IndexSearchToolTypeDeps;
}): AnyToolTypeDefinition[] => {
  const toolTypes: AnyToolTypeDefinition<any, any, any>[] = [
    getBuiltinToolType(),
    getEsqlToolType(),
    getIndexSearchToolType(indexSearchDeps),
    getWorkflowToolType({ workflowsManagement, security }),
    getMcpToolType({ actions }),
  ];
  return toolTypes;
};
