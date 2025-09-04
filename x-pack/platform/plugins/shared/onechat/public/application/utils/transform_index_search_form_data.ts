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
import type { OnechatIndexSearchToolFormData } from '../components/tools/index_search/form/types/index_search_tool_form_types';

export const transformIndexSearchToolToFormData = (
  tool: IndexSearchToolDefinition
): OnechatIndexSearchToolFormData => {
  return {
    name: tool.id,
    description: tool.description,
    pattern: tool.configuration.pattern,
    tags: tool.tags,
  };
};

export const transformFormDataToIndexSearchTool = (
  data: OnechatIndexSearchToolFormData
): IndexSearchToolDefinition => {
  return {
    id: data.name,
    description: data.description,
    configuration: {
      pattern: data.pattern,
    },
    type: ToolType.index_search,
    tags: data.tags,
  };
};

export const transformIndexSearchFormDataForCreate = (
  data: OnechatIndexSearchToolFormData
): CreateToolPayload => {
  return transformFormDataToIndexSearchTool(data);
};

export const transformIndexSearchFormDataForUpdate = (
  data: OnechatIndexSearchToolFormData
): UpdateToolPayload => {
  return omit(transformFormDataToIndexSearchTool(data), ['id', 'type']);
};
