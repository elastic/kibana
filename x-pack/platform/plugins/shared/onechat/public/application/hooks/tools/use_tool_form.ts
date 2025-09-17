/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { ToolType } from '@kbn/onechat-common';
import { useCallback } from 'react';
import type { Resolver, ResolverOptions } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import type {
  EsqlToolFormData,
  IndexSearchToolFormData,
  ToolFormData,
} from '../../components/tools/form/types/tool_form_types';
import { esqlFormValidationSchema } from '../../components/tools/form/validation/esql_tool_form_validation';
import { useIndexSearchToolFormValidationResolver } from '../../components/tools/form/validation/index_search_tool_form_validation';
import { zodResolver } from '../../utils/zod_resolver';

const getDefaultValues = (toolType: ToolType): ToolFormData => {
  switch (toolType) {
    case ToolType.esql:
      return {
        toolId: '',
        description: '',
        esql: '',
        labels: [],
        params: [],
        type: ToolType.esql,
      };
    case ToolType.index_search:
      return {
        toolId: '',
        description: '',
        labels: [],
        type: ToolType.index_search,
        pattern: '',
      };
    default:
      return {
        toolId: '',
        description: '',
        labels: [],
        type: toolType,
      };
  }
};

export const useToolForm = (tool?: ToolDefinitionWithSchema, initialToolType?: ToolType) => {
  const esqlResolver = zodResolver(esqlFormValidationSchema);
  const indexSearchResolver = useIndexSearchToolFormValidationResolver();

  const toolType = tool?.type ?? initialToolType ?? ToolType.esql;

  const dynamicResolver: Resolver<ToolFormData> = useCallback(
    async (data, context, options) => {
      const currentType = data.type || toolType;

      switch (currentType) {
        case ToolType.esql:
          return esqlResolver(
            data as EsqlToolFormData,
            context,
            options as ResolverOptions<EsqlToolFormData>
          );
        case ToolType.index_search:
          return indexSearchResolver(
            data as IndexSearchToolFormData,
            context,
            options as ResolverOptions<IndexSearchToolFormData>
          );
        default:
          // For builtin tools or unknown types, just return valid
          return {
            values: data,
            errors: {},
          };
      }
    },
    [esqlResolver, indexSearchResolver, toolType]
  );

  const form = useForm<ToolFormData>({
    defaultValues: getDefaultValues(toolType),
    resolver: dynamicResolver,
    mode: 'onBlur',
  });
  return form;
};
