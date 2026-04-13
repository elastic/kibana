/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common/tools';
import { z } from '@kbn/zod/v4';
import { sharedValidationSchemas } from './shared_tool_validation';

const kibanaApiOperationFormSchema = z.object({
  operation_id: z.string().min(1),
  method: z.string().min(1),
  path_template: z.string().min(1),
  workflow_connector_type: z.string().nullable(),
});

export const createKibanaApiFormValidationSchema = () =>
  z.object({
    toolId: sharedValidationSchemas.toolId,
    description: sharedValidationSchemas.description,
    labels: sharedValidationSchemas.labels,
    type: z.literal(ToolType.kibana_api),
    operations: z
      .array(kibanaApiOperationFormSchema)
      .min(1, { message: 'Select at least one Kibana API operation' }),
  });
