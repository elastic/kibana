/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryVariables } from '@kbn/esql-utils';

import type { EsqlToolDefinition, EsqlToolParam } from '@kbn/agent-builder-common';
import { ToolType } from '@kbn/agent-builder-common';
import { omit } from 'lodash';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';
import {
  EsqlParamSource,
  type EsqlToolFormData,
} from '../components/tools/form/types/tool_form_types';

/**
 * Transforms an ES|QL tool into its UI form representation.
 * @param tool - The ES|QL tool to transform.
 * @returns The ES|QL tool form data.
 */
export const transformEsqlToolToFormData = (tool: EsqlToolDefinition): EsqlToolFormData => {
  return {
    toolId: tool.id,
    description: tool.description,
    esql: tool.configuration.query,
    labels: tool.tags,
    params: Object.entries(tool.configuration.params).map(
      ([name, { type, description, optional, defaultValue }]) => ({
        name,
        type,
        description,
        source: EsqlParamSource.Custom,
        optional: optional ?? false,
        defaultValue,
      })
    ),
    type: ToolType.esql,
  };
};

/**
 * Transforms ES|QL tool form data into a `ToolDefinition` entity.
 * @param data - The ES|QL form data to transform.
 * @returns The transformed data as an ES|QL tool.
 */
export const transformFormDataToEsqlTool = (data: EsqlToolFormData): EsqlToolDefinition => {
  const esqlParams = new Set(getESQLQueryVariables(data.esql));
  return {
    id: data.toolId,
    description: data.description,
    readonly: false,
    configuration: {
      query: data.esql,
      params: data.params
        .filter((param) => esqlParams.has(param.name))
        .reduce((paramsMap, param) => {
          const paramConfig: EsqlToolParam = {
            type: param.type,
            description: param.description,
            optional: param.optional,
          };

          // Add defaultValue if provided and parameter is optional
          if (param.optional && param.defaultValue != null && param.defaultValue !== '') {
            paramConfig.defaultValue = param.defaultValue;
          }

          paramsMap[param.name] = paramConfig;
          return paramsMap;
        }, {} as Record<string, EsqlToolParam>),
    },
    type: ToolType.esql,
    tags: data.labels,
  };
};

/**
 * Transforms ES|QL form data into a payload for the create tools API.
 * @param data - The ES|QL form data to transform.
 * @returns The payload for the create tools API.
 */
export const transformEsqlFormDataForCreate = (data: EsqlToolFormData): CreateToolPayload => {
  return omit(transformFormDataToEsqlTool(data), ['readonly']);
};

/**
 * Transforms ES|QL tool form data into a payload for the update tool API.
 * @param data - The ES|QL form data to transform.
 * @returns The payload for the update tool API.
 */
export const transformEsqlFormDataForUpdate = (data: EsqlToolFormData): UpdateToolPayload => {
  return omit(transformFormDataToEsqlTool(data), ['id', 'type', 'readonly']);
};
