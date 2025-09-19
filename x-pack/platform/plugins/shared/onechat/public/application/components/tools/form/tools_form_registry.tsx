/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Resolver } from 'react-hook-form';
import { ToolType } from '@kbn/onechat-common';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { isEsqlTool, isIndexSearchTool } from '@kbn/onechat-common/tools';
import { z } from '@kbn/zod';

import type { OnechatInternalService } from '../../../../services/types';
import type { CreateToolPayload, UpdateToolPayload } from '../../../../../common/http_api/tools';
import type {
  ToolFormData,
  EsqlToolFormData,
  IndexSearchToolFormData,
  BuiltinToolFormData,
} from './types/tool_form_types';
import { EsqlConfiguration } from './sections/configuration_fields/esql_configuration_fields';
import { IndexSearchConfiguration } from './sections/configuration_fields/index_search_configuration_fields';
import {
  transformEsqlFormDataForCreate,
  transformEsqlFormDataForUpdate,
  transformEsqlToolToFormData,
} from '../../../utils/transform_esql_form_data';
import {
  transformIndexSearchFormDataForCreate,
  transformIndexSearchFormDataForUpdate,
  transformIndexSearchToolToFormData,
} from '../../../utils/transform_index_search_form_data';
import { createIndexSearchFormValidationSchema } from './validation/index_search_tool_form_validation';

import { transformBuiltInToolToFormData } from '../../../utils/transform_built_in_form_data';
import { esqlFormValidationSchema } from './validation/esql_tool_form_validation';
import { zodResolver } from '../../../utils/zod_resolver';
import { i18nMessages } from './i18n';

export interface ToolTypeRegistryEntry<TFormData extends ToolFormData = ToolFormData> {
  label: string;
  getConfigurationComponent: () => React.ComponentType;
  defaultValues: TFormData;
  toolToFormData: (tool: ToolDefinitionWithSchema) => TFormData;
  formDataToCreatePayload: (data: TFormData) => CreateToolPayload;
  formDataToUpdatePayload: (data: TFormData) => UpdateToolPayload;
  getValidationResolver: (services?: OnechatInternalService) => Resolver<TFormData>;
}

type EsqlToolTypeRegistryEntry = ToolTypeRegistryEntry<EsqlToolFormData>;
type IndexSearchToolTypeRegistryEntry = ToolTypeRegistryEntry<IndexSearchToolFormData>;
type BuiltinToolTypeRegistryEntry = ToolTypeRegistryEntry<BuiltinToolFormData>;

type SupportedToolTypeRegistryEntry =
  | EsqlToolTypeRegistryEntry
  | IndexSearchToolTypeRegistryEntry
  | BuiltinToolTypeRegistryEntry;

const commonToolDefaultValues = {
  toolId: '',
  description: '',
  labels: [],
};

export const TOOLS_FORM_REGISTRY: Record<ToolType, SupportedToolTypeRegistryEntry> = {
  [ToolType.esql]: {
    label: i18nMessages.configuration.form.type.esqlOption,
    getConfigurationComponent: () => EsqlConfiguration,
    defaultValues: {
      ...commonToolDefaultValues,
      esql: '',
      params: [],
      type: ToolType.esql,
    },
    toolToFormData: (tool: ToolDefinitionWithSchema) => {
      if (!isEsqlTool(tool)) {
        throw new Error('Expected ESQL tool');
      }
      return transformEsqlToolToFormData(tool);
    },
    formDataToCreatePayload: transformEsqlFormDataForCreate,
    formDataToUpdatePayload: transformEsqlFormDataForUpdate,
    getValidationResolver: () => zodResolver(esqlFormValidationSchema),
  },

  [ToolType.index_search]: {
    label: i18nMessages.configuration.form.type.indexSearchOption,
    getConfigurationComponent: () => IndexSearchConfiguration,
    defaultValues: {
      ...commonToolDefaultValues,
      type: ToolType.index_search,
      pattern: '',
    },
    toolToFormData: (tool: ToolDefinitionWithSchema) => {
      if (!isIndexSearchTool(tool)) {
        throw new Error('Expected index search tool');
      }
      return transformIndexSearchToolToFormData(tool);
    },
    formDataToCreatePayload: transformIndexSearchFormDataForCreate,
    formDataToUpdatePayload: transformIndexSearchFormDataForUpdate,
    getValidationResolver: (services) => {
      if (!services?.toolsService) {
        throw new Error('toolsService is required for index search validation');
      }
      return zodResolver(createIndexSearchFormValidationSchema(services.toolsService));
    },
  },
  // This is only for displaying read-only built-in tools
  [ToolType.builtin]: {
    label: '',
    getConfigurationComponent: () => {
      throw new Error("Built-in tools don't have a configuration component");
    },
    defaultValues: {
      ...commonToolDefaultValues,
      type: ToolType.builtin,
    },
    toolToFormData: transformBuiltInToolToFormData,
    formDataToCreatePayload: () => {
      throw new Error('Built-in tools cannot be created');
    },
    formDataToUpdatePayload: () => {
      throw new Error('Built-in tools cannot be updated');
    },
    getValidationResolver: () => zodResolver(z.any({})),
  },
};

export function getToolTypeConfig(toolType: ToolType) {
  return TOOLS_FORM_REGISTRY[toolType];
}

export function getCreatePayloadFromData(
  data: ToolFormData,
  toolType?: ToolType
): CreateToolPayload {
  const type = toolType || data.type;
  const config = getToolTypeConfig(type);

  if (!config) {
    throw new Error(`Unknown tool type: ${type}`);
  }
  // @ts-expect-error TS2345 - Union type ToolFormData cannot be narrowed to specific resolver type at compile time
  return config.formDataToCreatePayload(data);
}

export function getUpdatePayloadFromData(data: ToolFormData): UpdateToolPayload {
  const { type } = data;
  const config = getToolTypeConfig(type);

  if (!config) {
    throw new Error(`Unknown tool type: ${type}`);
  }
  // @ts-expect-error TS2345 - Union type ToolFormData cannot be narrowed to specific resolver type at compile time
  return config.formDataToUpdatePayload(data);
}

export function getEditableToolTypes(): Array<{ value: ToolType; text: string }> {
  return Object.entries(TOOLS_FORM_REGISTRY)
    .filter(([toolType]) => toolType !== ToolType.builtin)
    .map(([toolType, config]) => ({
      value: toolType as ToolType,
      text: config.label,
    }));
}

export function getToolTypeDefaultValues(toolType: ToolType): ToolFormData {
  const config = getToolTypeConfig(toolType);

  if (!config) {
    throw new Error(`Unknown tool type: ${toolType}`);
  }

  return config.defaultValues;
}
