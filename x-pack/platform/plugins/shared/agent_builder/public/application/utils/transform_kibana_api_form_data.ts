/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaApiToolDefinition } from '@kbn/agent-builder-common/tools';
import { ToolType } from '@kbn/agent-builder-common';
import { omit } from 'lodash';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';
import type { KibanaApiToolFormData } from '../components/tools/form/types/tool_form_types';

export const transformKibanaApiToolToFormData = (
  tool: KibanaApiToolDefinition
): KibanaApiToolFormData => {
  return {
    toolId: tool.id,
    description: tool.description,
    labels: tool.tags,
    type: ToolType.kibana_api,
    operations: tool.configuration.operations,
  };
};

export const transformFormDataToKibanaApiTool = (
  data: KibanaApiToolFormData
): KibanaApiToolDefinition => {
  return {
    id: data.toolId,
    description: data.description,
    readonly: false,
    type: ToolType.kibana_api,
    tags: data.labels,
    configuration: {
      operations: data.operations,
    },
  };
};

export const transformKibanaApiFormDataForCreate = (
  data: KibanaApiToolFormData
): CreateToolPayload => {
  return omit(transformFormDataToKibanaApiTool(data), ['readonly']) as unknown as CreateToolPayload;
};

export const transformKibanaApiFormDataForUpdate = (
  data: KibanaApiToolFormData
): UpdateToolPayload => {
  return omit(transformFormDataToKibanaApiTool(data), [
    'id',
    'type',
    'readonly',
  ]) as unknown as UpdateToolPayload;
};
