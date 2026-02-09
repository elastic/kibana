/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import { ToolType } from '@kbn/agent-builder-common';
import { useForm } from 'react-hook-form';
import type { ToolFormData } from '../../components/tools/form/types/tool_form_types';
import { getToolTypeDefaultValues } from '../../components/tools/form/registry/tools_form_registry';
import { useToolRegistryResolver } from './use_tool_registry_resolver';

export const useToolForm = (tool?: ToolDefinitionWithSchema, selectedToolType?: ToolType) => {
  const toolType = tool?.type ?? selectedToolType ?? ToolType.esql;

  const dynamicResolver = useToolRegistryResolver();

  const form = useForm<ToolFormData>({
    defaultValues: getToolTypeDefaultValues(toolType),
    resolver: dynamicResolver,
    mode: 'onBlur',
  });
  return form;
};
