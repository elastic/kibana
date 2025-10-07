/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { WorkflowDetailDto } from '@kbn/workflows/types/v1';
import type { WorkflowInputSchema } from '@kbn/workflows/spec/schema';

type InputType = z.infer<typeof WorkflowInputSchema>;

export const generateSchema = ({ workflow }: { workflow: WorkflowDetailDto }): z.ZodObject<any> => {
  if (!workflow.definition || !workflow.definition.inputs) {
    return z.object({});
  }

  const inputs = workflow.definition.inputs;

  const schemaFields: Record<string, z.ZodTypeAny> = {};
  for (const input of inputs) {
    schemaFields[input.name] = generateField(input);
  }

  return z.object(schemaFields).describe('Parameters needed to execute the workflow');
};

const generateField = (input: InputType) => {
  let field: z.ZodTypeAny;

  switch (input.type) {
    case 'string':
      field = z.string();
      break;
    case 'number':
      field = z.number();
      break;
    case 'boolean':
      field = z.boolean();
      break;
    case 'choice':
      field = z.enum(input.options as [string, ...string[]]);
      break;
    default:
      field = z.any();
      break;
  }

  field = field.describe(input.description ?? input.name);
  if (input.required !== true) {
    field = field.optional();
  }
  if (input.default) {
    field = field.default(input.default);
  }

  return field;
};
