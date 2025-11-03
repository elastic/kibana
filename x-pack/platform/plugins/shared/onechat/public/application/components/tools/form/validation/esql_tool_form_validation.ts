/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryVariables } from '@kbn/esql-utils';
import { validateQuery } from '@kbn/esql-validation-autocomplete';
import { i18n } from '@kbn/i18n';
import type { EsqlToolFieldTypes } from '@kbn/onechat-common/tools';
import { EsqlToolFieldType, ToolType } from '@kbn/onechat-common/tools';
import { z } from '@kbn/zod';
import { sharedValidationSchemas } from './shared_tool_validation';
import { EsqlParamSource } from '../types/tool_form_types';

const esqlI18nMessages = {
  // Specific errors will be provided by the ES|QL editor
  esql: {
    requiredError: i18n.translate('xpack.onechat.tools.newTool.validation.esql.requiredError', {
      defaultMessage: 'ES|QL query is required.',
    }),
    esqlError: i18n.translate('xpack.onechat.tools.newTool.validation.esql.esqlError', {
      defaultMessage: 'Please fix the errors in your ES|QL query.',
    }),
  },
  params: {
    nameRequiredError: i18n.translate(
      'xpack.onechat.tools.newTool.validation.params.nameRequiredError',
      {
        defaultMessage: 'Parameter name is required.',
      }
    ),
    nameFormatError: i18n.translate(
      'xpack.onechat.tools.newTool.validation.params.nameFormatError',
      {
        defaultMessage:
          'Parameter name must start with a letter or underscore and contain only letters, numbers, and underscores.',
      }
    ),
    descriptionRequiredError: i18n.translate(
      'xpack.onechat.tools.newTool.validation.params.descriptionRequiredError',
      {
        defaultMessage: 'Parameter description is required.',
      }
    ),
    duplicateError: (name: string) =>
      i18n.translate('xpack.onechat.tools.newTool.validation.params.duplicateError', {
        defaultMessage: 'Duplicate parameter: "{name}".',
        values: { name },
      }),
  },
};

export const esqlFormValidationSchema = z
  .object({
    // Use shared validation schemas for common fields
    toolId: sharedValidationSchemas.toolId,
    description: sharedValidationSchemas.description,
    labels: sharedValidationSchemas.labels,

    // ESQL specific validation
    esql: z
      .string()
      .min(1, { message: esqlI18nMessages.esql.requiredError })
      .refine(
        async (esql) => {
          const result = await validateQuery(esql);
          return result.errors.length === 0;
        },
        { message: esqlI18nMessages.esql.esqlError }
      ),
    params: z
      .array(
        z.object({
          name: z
            .string()
            .min(1, { message: esqlI18nMessages.params.nameRequiredError })
            .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
              message: esqlI18nMessages.params.nameFormatError,
            }),
          description: z
            .string()
            .min(1, { message: esqlI18nMessages.params.descriptionRequiredError }),
          type: z.custom<EsqlToolFieldTypes>((data) =>
            Object.values(EsqlToolFieldType).includes(data)
          ),
          source: z.nativeEnum(EsqlParamSource),
          optional: z.boolean(),
        })
      )
      .superRefine((params, ctx) => {
        params.forEach(({ name }, index) => {
          const otherParamNames = new Set(
            params.filter((_, i) => i !== index).map((param) => param.name)
          );

          if (otherParamNames.has(name)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: esqlI18nMessages.params.duplicateError(name),
              path: [index, 'name'],
            });
          }
        });
      }),
    type: z.literal(ToolType.esql),
  })
  .superRefine(({ esql, params }, ctx) => {
    const inferredParams = getESQLQueryVariables(esql);
    const definedParams = new Set(params.map((param) => param.name));

    for (const param of inferredParams) {
      if (!definedParams.has(param)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: esqlI18nMessages.esql.esqlError,
          path: ['esql'],
        });
        return;
      }
    }
  });
