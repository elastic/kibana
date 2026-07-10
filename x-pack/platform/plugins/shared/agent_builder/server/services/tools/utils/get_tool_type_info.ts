/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { ToolTypeInfo } from '../../../../common/tools';
import type { AnyToolTypeDefinition } from '../tool_types/definitions';
import { isBuiltinDefinition, isEnabledDefinition } from '../tool_types/definitions';

export interface GetToolTypeInfoOptions {
  /**
   * Whether the current user can create workflow tools (i.e. holds
   * `workflowsManagement:read`). When false, the workflow tool type is reported
   * as non-creatable. Defaults to true.
   *
   * This is a UX hint only; creation and execution are enforced independently.
   */
  workflowToolsCreatable?: boolean;
}

export const getToolTypeInfo = (
  definitions: AnyToolTypeDefinition[],
  { workflowToolsCreatable = true }: GetToolTypeInfoOptions = {}
): ToolTypeInfo[] => {
  const typeInfos: ToolTypeInfo[] = [];

  for (const definition of definitions) {
    if (isEnabledDefinition(definition)) {
      typeInfos.push({
        type: definition.toolType,
        create: definition.toolType === ToolType.workflow ? workflowToolsCreatable : true,
      });
    }
    if (isBuiltinDefinition(definition)) {
      typeInfos.push({
        type: definition.toolType,
        create: false,
      });
    }
  }

  return typeInfos;
};
