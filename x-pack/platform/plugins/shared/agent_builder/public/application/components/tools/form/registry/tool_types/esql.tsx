/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { ToolDefinitionWithSchema } from '@kbn/agent-builder-common';
import { isEsqlTool } from '@kbn/agent-builder-common/tools';

import { EsqlConfiguration } from '../../sections/configuration_fields/esql_configuration_fields';

import {
  transformEsqlFormDataForCreate,
  transformEsqlFormDataForUpdate,
  transformEsqlToolToFormData,
} from '../../../../../utils/transform_esql_form_data';

import { esqlFormValidationSchema } from '../../validation/esql_tool_form_validation';
import { zodResolver } from '../../../../../utils/zod_resolver';
import { i18nMessages } from '../../i18n';
import type { ToolTypeRegistryEntry } from '../common';
import type { EsqlParamFormData, EsqlToolFormData } from '../../types/tool_form_types';
import { commonToolFormDefaultValues } from '../common';

export const ESQL_DEFAULT_PARAMS: EsqlParamFormData[] = [];

export const esqlToolFormRegistryEntry: ToolTypeRegistryEntry<EsqlToolFormData> = {
  label: i18nMessages.configuration.form.type.esqlOption,
  getConfigurationComponent: () => EsqlConfiguration,
  defaultValues: {
    ...commonToolFormDefaultValues,
    esql: '',
    params: ESQL_DEFAULT_PARAMS,
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
