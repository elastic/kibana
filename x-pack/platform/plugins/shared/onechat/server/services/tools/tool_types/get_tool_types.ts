/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AnyToolTypeDefinition } from './definitions';
import { getEsqlToolType } from './esql';
import { getIndexSearchToolType } from './index_search';
import { getWorkflowToolType } from './workflow';
import { getBuiltinToolType } from './builtin';

export const getToolTypeDefinitions = ({
  workflowsManagement,
}: {
  workflowsManagement?: WorkflowsServerPluginSetup;
}): AnyToolTypeDefinition[] => {
  const toolTypes: AnyToolTypeDefinition<any, any, any>[] = [
    getBuiltinToolType(),
    getEsqlToolType(),
    getIndexSearchToolType(),
    getWorkflowToolType({ workflowsManagement }),
  ];
  return toolTypes;
};
