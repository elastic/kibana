/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Resolver } from 'react-hook-form';
import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';

import type { AgentBuilderInternalService } from '../../../../../services/types';
import type { CreateToolPayload, UpdateToolPayload } from '../../../../../../common/http_api/tools';
import type { ToolFormData } from '../types/tool_form_types';
import type { ToolFormMode } from '../tool_form';

export const commonToolFormDefaultValues = {
  toolId: '',
  description: '',
  labels: [],
};

interface ConfigurationComponentProps {
  mode: ToolFormMode;
}

export interface ToolTypeRegistryEntry<TFormData extends ToolFormData = ToolFormData> {
  label: string;
  getConfigurationComponent: () => React.ComponentType<ConfigurationComponentProps>;
  defaultValues: TFormData;
  toolToFormData: (tool: ToolDefinitionWithSchema) => TFormData;
  formDataToCreatePayload: (data: TFormData) => CreateToolPayload;
  formDataToUpdatePayload: (data: TFormData) => UpdateToolPayload;
  getValidationResolver: (services?: AgentBuilderInternalService) => Resolver<TFormData>;
}
