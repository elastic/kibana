/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { isIndexSearchTool } from '@kbn/onechat-common/tools';

import { IndexSearchConfiguration } from '../../sections/configuration_fields/index_search_configuration_fields';

import {
  transformIndexSearchFormDataForCreate,
  transformIndexSearchFormDataForUpdate,
  transformIndexSearchToolToFormData,
} from '../../../../../utils/transform_index_search_form_data';
import { createIndexSearchFormValidationSchema } from '../../validation/index_search_tool_form_validation';

import { zodResolver } from '../../../../../utils/zod_resolver';
import { i18nMessages } from '../../i18n';
import type { IndexSearchToolTypeRegistryEntry } from '../common';
import { commonToolFormDefaultValues } from '../common';

export const indexSearchToolRegistryEntry: IndexSearchToolTypeRegistryEntry = {
  label: i18nMessages.configuration.form.type.indexSearchOption,
  getConfigurationComponent: () => IndexSearchConfiguration,
  defaultValues: {
    ...commonToolFormDefaultValues,
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
};
