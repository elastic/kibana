/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';

import type { CreateToolPayload, UpdateToolPayload } from '../../../../../../common/http_api/tools';
import type { ToolFormData } from '../types/tool_form_types';

import { esqlToolFormRegistryEntry } from './tool_types/esql';
import type { SupportedToolTypeRegistryEntry } from './common';
import { indexSearchToolRegistryEntry } from './tool_types/index_search';
import { builtinToolRegistryEntry } from './tool_types/builtin';
import { workflowToolRegistryEntry } from './tool_types/workflow';

export const TOOLS_FORM_REGISTRY: Record<ToolType, SupportedToolTypeRegistryEntry> = {
  [ToolType.esql]: esqlToolFormRegistryEntry,
  [ToolType.index_search]: indexSearchToolRegistryEntry,
  [ToolType.workflow]: workflowToolRegistryEntry,
  // This is only for displaying read-only built-in tools
  [ToolType.builtin]: builtinToolRegistryEntry,
};

export function getToolTypeConfig(toolType: ToolType) {
  return TOOLS_FORM_REGISTRY[toolType];
}

export function getCreatePayloadFromData(
  data: ToolFormData,
  toolType?: ToolType
): CreateToolPayload {
  const type = toolType || data.type;
  const config = getToolTypeConfig(type);

  if (!config) {
    throw new Error(`Unknown tool type: ${type}`);
  }
  // @ts-expect-error TS2345 - Union type ToolFormData cannot be narrowed to specific resolver type at compile time
  return config.formDataToCreatePayload(data);
}

export function getUpdatePayloadFromData(data: ToolFormData): UpdateToolPayload {
  const { type } = data;
  const config = getToolTypeConfig(type);

  if (!config) {
    throw new Error(`Unknown tool type: ${type}`);
  }
  // @ts-expect-error TS2345 - Union type ToolFormData cannot be narrowed to specific resolver type at compile time
  return config.formDataToUpdatePayload(data);
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

  if (!config) {
    throw new Error(`Unknown tool type: ${toolType}`);
  }

  return config.defaultValues;
}
