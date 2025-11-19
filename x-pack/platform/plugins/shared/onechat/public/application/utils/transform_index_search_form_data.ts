/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexSearchToolDefinition } from '@kbn/onechat-common/tools';
import { ToolType } from '@kbn/onechat-common';
import { omit } from 'lodash';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';
import type { IndexSearchToolFormData } from '../components/tools/form/types/tool_form_types';

export const transformIndexSearchToolToFormData = (
  tool: IndexSearchToolDefinition
): IndexSearchToolFormData => {
  return {
    toolId: tool.id,
    description: tool.description,
    pattern: tool.configuration.pattern,
    rowLimit: tool.configuration.rowLimit,
    customInstructions: tool.configuration.customInstructions,
    labels: tool.tags,
    type: ToolType.index_search,
  };
};

export const transformFormDataToIndexSearchTool = (
  data: IndexSearchToolFormData
): IndexSearchToolDefinition => {
  return {
    id: data.toolId,
    description: data.description,
    readonly: false,
    configuration: {
      pattern: data.pattern,
      rowLimit: data.rowLimit,
      customInstructions: data.customInstructions,
    },
    type: ToolType.index_search,
    tags: data.labels,
  };
};

export const transformIndexSearchFormDataForCreate = (
  data: IndexSearchToolFormData
): CreateToolPayload => {
  return omit(transformFormDataToIndexSearchTool(data), ['readonly']);
};

export const transformIndexSearchFormDataForUpdate = (
  data: IndexSearchToolFormData
): UpdateToolPayload => {
  return omit(transformFormDataToIndexSearchTool(data), ['id', 'type', 'readonly']);
};
