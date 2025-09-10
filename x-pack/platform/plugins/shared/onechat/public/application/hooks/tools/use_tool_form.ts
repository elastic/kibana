/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { ToolType } from '@kbn/onechat-common';
import type { Resolver } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import type { ToolFormData } from '../../components/tools/form/types/tool_form_types';
import { useEsqlToolFormValidationResolver } from '../../components/tools/form/validation/esql_tool_form_validation';

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
  const esqlResolver = useEsqlToolFormValidationResolver();

  const toolType = tool?.type ?? initialToolType ?? ToolType.esql;

  const form = useForm<ToolFormData>({
    defaultValues: getDefaultValues(toolType),
    resolver: toolType === ToolType.esql ? (esqlResolver as Resolver<ToolFormData>) : undefined,
    mode: 'onBlur',
  });
  return form;
};
