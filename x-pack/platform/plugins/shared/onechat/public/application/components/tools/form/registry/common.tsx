/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Resolver } from 'react-hook-form';

import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';

import type { OnechatInternalService } from '../../../../../services/types';
import type { CreateToolPayload, UpdateToolPayload } from '../../../../../../common/http_api/tools';
import type {
  ToolFormData,
  EsqlToolFormData,
  IndexSearchToolFormData,
  BuiltinToolFormData,
} from '../types/tool_form_types';

export const commonToolFormDefaultValues = {
  toolId: '',
  description: '',
  labels: [],
};

export interface ToolTypeRegistryEntry<TFormData extends ToolFormData = ToolFormData> {
  label: string;
  getConfigurationComponent: () => React.ComponentType;
  defaultValues: TFormData;
  toolToFormData: (tool: ToolDefinitionWithSchema) => TFormData;
  formDataToCreatePayload: (data: TFormData) => CreateToolPayload;
  formDataToUpdatePayload: (data: TFormData) => UpdateToolPayload;
  getValidationResolver: (services?: OnechatInternalService) => Resolver<TFormData>;
}

export type EsqlToolTypeRegistryEntry = ToolTypeRegistryEntry<EsqlToolFormData>;
export type IndexSearchToolTypeRegistryEntry = ToolTypeRegistryEntry<IndexSearchToolFormData>;
export type BuiltinToolTypeRegistryEntry = ToolTypeRegistryEntry<BuiltinToolFormData>;

export type SupportedToolTypeRegistryEntry =
  | EsqlToolTypeRegistryEntry
  | IndexSearchToolTypeRegistryEntry
  | BuiltinToolTypeRegistryEntry;
