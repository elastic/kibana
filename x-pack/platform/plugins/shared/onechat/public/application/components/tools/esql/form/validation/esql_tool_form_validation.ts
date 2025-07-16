/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryVariables } from '@kbn/esql-utils';
import { validateQuery } from '@kbn/esql-validation-autocomplete';
import { i18n } from '@kbn/i18n';
import { EsqlToolFieldType, idRegexp, isReservedToolId } from '@kbn/onechat-common';
import { set } from '@kbn/safer-lodash-set';
import { z } from '@kbn/zod';
import { get } from 'lodash';
import { useCallback } from 'react';
import { Resolver } from 'react-hook-form';
import { OnechatEsqlToolFormData } from '../types/esql_tool_form_types';

const i18nMessages = {
  name: {
    requiredError: i18n.translate('xpack.onechat.tools.newTool.validation.name.requiredError', {
      defaultMessage: 'Name is required.',
    }),
    formatError: i18n.translate('xpack.onechat.tools.newTool.validation.name.formatError', {
      defaultMessage:
        'Name must start and end with a letter or number, and can only contain lowercase letters, numbers, and underscores.',
    }),
    reservedError: (name: string) =>
      i18n.translate('xpack.onechat.tools.newTool.validation.name.reservedError', {
        defaultMessage: 'Name "{name}" is reserved. Please choose a different name.',
        values: { name },
      }),
  },
  description: {
    requiredError: i18n.translate(
      'xpack.onechat.tools.newTool.validation.description.requiredError',
      {
        defaultMessage: 'Description is required.',
      }
    ),
  },
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

export const useEsqlToolFormValidationResolver = (): Resolver<OnechatEsqlToolFormData> => {
  return useCallback(async (data) => {
    try {
      const values = await esqlFormValidationSchema.parseAsync(data);
      return {
        values,
        errors: {},
      };
    } catch (error: unknown) {
      if (!(error instanceof z.ZodError)) {
        throw error;
      }
      const errors = error.issues.reduce<Record<string, { type: string; message: string }>>(
        (errorMap, issue) => {
          const path = issue.path.join('.');
          if (!get(errorMap, path)) {
            set(errorMap, path, {
              type: issue.code,
              message: issue.message,
            });
          }
          return errorMap;
        },
        {}
      );

      return {
        values: {},
        errors,
      };
    }
  }, []);
};

export const esqlFormValidationSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: i18nMessages.name.requiredError })
      .regex(idRegexp, { message: i18nMessages.name.formatError })
      .refine(
        (name) => !isReservedToolId(name),
        (name) => ({
          message: i18nMessages.name.reservedError(name),
        })
      ),
    description: z.string().min(1, { message: i18nMessages.description.requiredError }),
    esql: z
      .string()
      .min(1, { message: i18nMessages.esql.requiredError })
      .refine(
        async (esql) => {
          const result = await validateQuery(esql, { ignoreOnMissingCallbacks: true });
          return result.errors.length === 0;
        },
        { message: i18nMessages.esql.esqlError }
      ),
    params: z
      .array(
        z.object({
          name: z.string().min(1, { message: i18nMessages.params.nameRequiredError }),
          description: z.string().min(1, { message: i18nMessages.params.descriptionRequiredError }),
          type: z.nativeEnum(EsqlToolFieldType),
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
              message: i18nMessages.params.duplicateError(name),
              path: [index, 'name'],
            });
          }
        });
      }),
    tags: z.array(z.string()),
  })
  .superRefine(({ esql, params }, ctx) => {
    const inferredParams = getESQLQueryVariables(esql);
    const definedParams = new Set(params.map((param) => param.name));

    for (const param of inferredParams) {
      if (!definedParams.has(param)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: i18nMessages.esql.esqlError,
          path: ['esql'],
        });
        return;
      }
    }
  });
