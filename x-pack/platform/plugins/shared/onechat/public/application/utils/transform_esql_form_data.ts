/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryVariables } from '@kbn/esql-utils';
import type { EsqlToolDefinition, EsqlToolFieldTypes } from '@kbn/onechat-common';
import { ToolType } from '@kbn/onechat-common';
import { omit } from 'lodash';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';
import type { OnechatEsqlToolFormData } from '../components/tools/esql/form/types/esql_tool_form_types';

/**
 * Transforms an ES|QL tool into its UI form representation.
 * @param tool - The ES|QL tool to transform.
 * @returns The ES|QL tool form data.
 */
export const transformEsqlToolToFormData = (tool: EsqlToolDefinition): OnechatEsqlToolFormData => {
  return {
    name: tool.id,
    description: tool.description,
    esql: tool.configuration.query,
    tags: tool.tags,
    params: Object.entries(tool.configuration.params).map(([name, { type, description }]) => ({
      name,
      type,
      description,
    })),
  };
};

/**
 * Transforms ES|QL tool form data into a `ToolDefinition` entity.
 * @param data - The ES|QL form data to transform.
 * @returns The transformed data as an ES|QL tool.
 */
export const transformFormDataToEsqlTool = (data: OnechatEsqlToolFormData): EsqlToolDefinition => {
  const esqlParams = new Set(getESQLQueryVariables(data.esql));
  return {
    id: data.name,
    description: data.description,
    configuration: {
      query: data.esql,
      params: data.params
        .filter((param) => esqlParams.has(param.name))
        .reduce((paramsMap, param) => {
          paramsMap[param.name] = {
            type: param.type,
            description: param.description,
          };
          return paramsMap;
        }, {} as Record<string, { type: EsqlToolFieldTypes; description: string }>),
    },
    type: ToolType.esql,
    tags: data.tags,
  };
};

/**
 * Transforms ES|QL form data into a payload for the create tools API.
 * @param data - The ES|QL form data to transform.
 * @returns The payload for the create tools API.
 */
export const transformEsqlFormDataForCreate = (
  data: OnechatEsqlToolFormData
): CreateToolPayload => {
  return transformFormDataToEsqlTool(data);
};

/**
 * Transforms ES|QL tool form data into a payload for the update tool API.
 * @param data - The ES|QL form data to transform.
 * @returns The payload for the update tool API.
 */
export const transformEsqlFormDataForUpdate = (
  data: OnechatEsqlToolFormData
): UpdateToolPayload => {
  return omit(transformFormDataToEsqlTool(data), ['id', 'type']);
};
