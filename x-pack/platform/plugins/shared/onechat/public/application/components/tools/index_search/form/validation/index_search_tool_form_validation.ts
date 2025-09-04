/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { idRegexp, isReservedToolId } from '@kbn/onechat-common';
import { set } from '@kbn/safer-lodash-set';
import { z } from '@kbn/zod';
import { get } from 'lodash';
import { useCallback } from 'react';
import type { Resolver } from 'react-hook-form';
import type { OnechatIndexSearchToolFormData } from '../types/index_search_tool_form_types';

const i18nMessages = {
  name: {
    requiredError: i18n.translate('xpack.onechat.tools.indexSearch.validation.name.requiredError', {
      defaultMessage: 'Name is required.',
    }),
    formatError: i18n.translate('xpack.onechat.tools.indexSearch.validation.name.formatError', {
      defaultMessage:
        'Name must start and end with a letter or number, and can only contain lowercase letters, numbers, and underscores.',
    }),
    reservedError: (name: string) =>
      i18n.translate('xpack.onechat.tools.indexSearch.validation.name.reservedError', {
        defaultMessage: 'Name "{name}" is reserved. Please choose a different name.',
        values: { name },
      }),
  },
  description: {
    requiredError: i18n.translate(
      'xpack.onechat.tools.indexSearch.validation.description.requiredError',
      {
        defaultMessage: 'Description is required.',
      }
    ),
  },
  pattern: {
    requiredError: i18n.translate('xpack.onechat.tools.indexSearch.validation.pattern.required', {
      defaultMessage: 'Index pattern is required.',
    }),
  },
};

export const useIndexSearchToolFormValidationResolver =
  (): Resolver<OnechatIndexSearchToolFormData> => {
    return useCallback(async (data) => {
      try {
        const values = await indexSearchFormValidationSchema.parseAsync(data);
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

export const indexSearchFormValidationSchema = z.object({
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
  pattern: z.string().min(1, { message: i18nMessages.pattern.requiredError }),
  tags: z.array(z.string()),
});
