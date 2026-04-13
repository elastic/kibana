/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import { isKibanaApiTool } from '@kbn/agent-builder-common/tools';

import { KibanaApiConfiguration } from '../../sections/configuration_fields/kibana_api_configuration_fields';

import {
  transformKibanaApiFormDataForCreate,
  transformKibanaApiFormDataForUpdate,
  transformKibanaApiToolToFormData,
} from '../../../../../utils/transform_kibana_api_form_data';
import { createKibanaApiFormValidationSchema } from '../../validation/kibana_api_tool_form_validation';

import { zodResolver } from '../../../../../utils/zod_resolver';
import { i18nMessages } from '../../i18n';
import type { ToolTypeRegistryEntry } from '../common';
import type { KibanaApiToolFormData } from '../../types/tool_form_types';
import { commonToolFormDefaultValues } from '../common';

export const kibanaApiToolRegistryEntry: ToolTypeRegistryEntry<KibanaApiToolFormData> = {
  label: i18nMessages.configuration.form.type.kibanaApiOption,
  getConfigurationComponent: () => KibanaApiConfiguration,
  defaultValues: {
    ...commonToolFormDefaultValues,
    type: ToolType.kibana_api,
    operations: [],
  },
  toolToFormData: (tool: ToolDefinitionWithSchema) => {
    if (!isKibanaApiTool(tool)) {
      throw new Error('Expected Kibana API tool');
    }
    return transformKibanaApiToolToFormData(tool);
  },
  formDataToCreatePayload: transformKibanaApiFormDataForCreate,
  formDataToUpdatePayload: transformKibanaApiFormDataForUpdate,
  getValidationResolver: () => zodResolver(createKibanaApiFormValidationSchema()),
};
