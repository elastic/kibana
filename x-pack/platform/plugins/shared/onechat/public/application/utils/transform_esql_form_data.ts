/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlToolFieldTypes, ToolType } from '@kbn/onechat-common';
import { CreateToolPayload } from '../../../common/http_api/tools';
import { OnechatEsqlToolFormData } from '../components/tools/esql/form/types/esql_tool_form_types';

/**
 * Transforms ES|QL form data into a payload for the create tools API.
 * @param data - The ES|QL form data to transform.
 * @returns The payload for the create tools API.
 */
export const transformEsqlFormData = (data: OnechatEsqlToolFormData): CreateToolPayload => {
  return {
    id: data.name,
    description: data.description,
    configuration: {
      query: data.esql,
      params: data.params.reduce((paramsMap, param) => {
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
