/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { isEsqlTool } from '@kbn/onechat-common/tools';

import { EsqlConfiguration } from '../../sections/configuration_fields/esql_configuration_fields';

import {
  transformEsqlFormDataForCreate,
  transformEsqlFormDataForUpdate,
  transformEsqlToolToFormData,
} from '../../../../../utils/transform_esql_form_data';

import { esqlFormValidationSchema } from '../../validation/esql_tool_form_validation';
import { zodResolver } from '../../../../../utils/zod_resolver';
import { i18nMessages } from '../../i18n';
import type { EsqlToolTypeRegistryEntry } from '../common';
import { commonToolFormDefaultValues } from '../common';

export const esqlToolFormRegistryEntry: EsqlToolTypeRegistryEntry = {
  label: i18nMessages.configuration.form.type.esqlOption,
  getConfigurationComponent: () => EsqlConfiguration,
  defaultValues: {
    ...commonToolFormDefaultValues,
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
};
