/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import type {
  RuleBuilderDefinition,
  RuleBuilderParamsPatch,
  RuleBuilderParamsSchema,
  RuleBuilderType,
} from './types';

const REMOVE_HINT = 'Send `null` to remove it.';

const getDescription = (field: z.core.$ZodType): string | undefined =>
  field instanceof z.ZodType ? field.description : undefined;

/**
 * Required fields become optional, defaulted fields lose their default so a patch can't
 * reset them, and optional fields also accept `null` to remove them.
 */
const toPatchField = (field: z.core.$ZodType): z.ZodType => {
  const description = getDescription(field);

  if (field instanceof z.ZodOptional) {
    const removable = z.optional(z.nullable(field.unwrap()));
    return removable.describe(description ? `${description} ${REMOVE_HINT}` : REMOVE_HINT);
  }

  const patchField = z.optional(field instanceof z.ZodDefault ? field.unwrap() : field);
  return description ? patchField.describe(description) : patchField;
};

/** Derives the schema for changes to existing params from a builder's params schema. */
export const createParamsPatchSchema = (
  paramsSchema: RuleBuilderParamsSchema<unknown>,
  title: string
): z.ZodType<RuleBuilderParamsPatch> =>
  z
    .strictObject(
      Object.fromEntries(
        Object.entries(paramsSchema.shape).map(([key, field]) => [key, toPatchField(field)])
      )
    )
    .describe(
      `Changes to the ${title} params. Each field you send replaces its current value wholesale, including arrays; fields you leave out keep their current value.`
    );

/**
 * Turns a builder author's definition into a rule builder type. Agent tools are derived
 * from the definition's params schema, so authors don't write tools of their own.
 */
export const defineRuleBuilder = <TParams, TFormState>(
  definition: RuleBuilderDefinition<TParams, TFormState>
): RuleBuilderType<TParams, TFormState> => ({
  ...definition,
  paramsPatchSchema: lazySchema(() =>
    createParamsPatchSchema(definition.paramsSchema, definition.title)
  ),
});
