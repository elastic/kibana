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
import type { OnechatInternalService } from '../../../services/types';
import type { CreateToolPayload, UpdateToolPayload } from '../../../../common/http_api/tools';
import type {
  ToolFormData,
  EsqlToolFormData,
  IndexSearchToolFormData,
  BuiltinToolFormData,
} from './form/types/tool_form_types';
import { EsqlConfiguration } from './form/sections/configuration_fields/esql_configuration_fields';
import { IndexSearchConfiguration } from './form/sections/configuration_fields/index_search_configuration_fields';
import {
  transformEsqlFormDataForCreate,
  transformEsqlFormDataForUpdate,
  transformEsqlToolToFormData,
} from '../../utils/transform_esql_form_data';
import {
  transformIndexSearchFormDataForCreate,
  transformIndexSearchFormDataForUpdate,
  transformIndexSearchToolToFormData,
} from '../../utils/transform_index_search_form_data';
import { createIndexSearchFormValidationSchema } from './form/validation/index_search_tool_form_validation';

// Removed unused type guard imports since we're using registry-based approach
import { transformBuiltInToolToFormData } from '../../utils/transform_built_in_form_data';
import { esqlFormValidationSchema } from './form/validation/esql_tool_form_validation';
import { zodResolver } from '../../utils/zod_resolver';
import { i18nMessages } from './form/i18n';

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

export const TOOLS_REGISTRY = new Map([
  [
    ToolType.esql,
    {
      label: i18nMessages.configuration.form.type.esqlOption,
      getConfigurationComponent: () => EsqlConfiguration,
      defaultValues: {
        toolId: '',
        description: '',
        esql: '',
        labels: [],
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
    } satisfies EsqlToolTypeRegistryEntry,
  ],
  [
    ToolType.index_search,
    {
      label: i18nMessages.configuration.form.type.indexSearchOption,
      getConfigurationComponent: () => IndexSearchConfiguration,
      defaultValues: {
        toolId: '',
        description: '',
        labels: [],
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
    } satisfies IndexSearchToolTypeRegistryEntry,
  ],
  [
    ToolType.builtin,
    {
      label: 'Built-in',
      getConfigurationComponent: () => (() => null) as React.ComponentType,
      defaultValues: {
        toolId: '',
        description: '',
        labels: [],
        type: ToolType.builtin,
      },
      toolToFormData: transformBuiltInToolToFormData,
      formDataToCreatePayload: () => {
        throw new Error('Built-in tools cannot be created');
      },
      formDataToUpdatePayload: () => {
        throw new Error('Built-in tools cannot be updated');
      },
      getValidationResolver: (services) => {
        // Built-in tools have minimal validation
        return async (data) => ({
          values: data,
          errors: {},
        });
      },
    } satisfies BuiltinToolTypeRegistryEntry,
  ],
]);

export function getToolTypeConfig(toolType: ToolType) {
  return TOOLS_REGISTRY.get(toolType);
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

  return config.formDataToCreatePayload(data as any);
}

export function getUpdatePayloadFromData(
  data: ToolFormData,
  toolType?: ToolType
): UpdateToolPayload {
  const type = toolType || data.type;
  const config = getToolTypeConfig(type);

  if (!config) {
    throw new Error(`Unknown tool type: ${type}`);
  }

  return config.formDataToUpdatePayload(data);
}

export function getAvailableToolTypes(): Array<{ value: ToolType; text: string }> {
  return Array.from(TOOLS_REGISTRY.entries())
    .filter(([toolType]) => toolType !== ToolType.builtin)
    .map(([toolType, config]) => ({
      value: toolType,
      text: config.label,
    }));
}

export function isEditableToolType(toolType: ToolType): boolean {
  return toolType !== ToolType.builtin;
}

export function getToolTypeDefaultValues(toolType: ToolType): ToolFormData {
  const config = getToolTypeConfig(toolType);

  if (!config) {
    throw new Error(`Unknown tool type: ${toolType}`);
  }

  return config.defaultValues;
}
