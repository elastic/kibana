/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';

import type { CreateToolPayload, UpdateToolPayload } from '../../../../../../common/http_api/tools';
import type { ToolFormData } from '../types/tool_form_types';

import { esqlToolFormRegistryEntry } from './tool_types/esql';
import { indexSearchToolRegistryEntry } from './tool_types/index_search';
import { builtinToolRegistryEntry } from './tool_types/builtin';
import { workflowToolRegistryEntry } from './tool_types/workflow';
import { mcpToolRegistryEntry } from './tool_types/mcp';

export const TOOLS_FORM_REGISTRY = {
  [ToolType.esql]: esqlToolFormRegistryEntry,
  [ToolType.index_search]: indexSearchToolRegistryEntry,
  [ToolType.workflow]: workflowToolRegistryEntry,
  [ToolType.builtin]: builtinToolRegistryEntry,
  [ToolType.mcp]: mcpToolRegistryEntry,
};

export function getToolTypeConfig<T extends ToolType>(
  toolType: T
): (typeof TOOLS_FORM_REGISTRY)[T] {
  const config = TOOLS_FORM_REGISTRY[toolType];
  if (!config) {
    throw new Error(`Unknown tool type: ${toolType}`);
  }
  return config;
}

export function getCreatePayloadFromData<T extends ToolFormData>(data: T): CreateToolPayload {
  const config = getToolTypeConfig(data.type);
  return config.formDataToCreatePayload(data as any);
}

export function getUpdatePayloadFromData<T extends ToolFormData>(data: T): UpdateToolPayload {
  const config = getToolTypeConfig(data.type);
  return config.formDataToUpdatePayload(data as any);
}

export function getEditableToolTypes(): Array<{ value: ToolType; text: string }> {
  return Object.entries(TOOLS_FORM_REGISTRY)
    .filter(([toolType]) => toolType !== ToolType.builtin)
    .map(([toolType, config]) => ({
      value: toolType as ToolType,
      text: config.label,
    }));
}

export function getToolTypeDefaultValues(toolType: ToolType): ToolFormData {
  const config = getToolTypeConfig(toolType);
  return config.defaultValues;
}
