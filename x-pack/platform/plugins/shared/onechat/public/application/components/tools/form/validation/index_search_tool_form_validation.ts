/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ToolType } from '@kbn/onechat-common/tools';
import { set } from '@kbn/safer-lodash-set';
import { z } from '@kbn/zod';
import { get } from 'lodash';
import { useCallback } from 'react';
import type { Resolver } from 'react-hook-form';
import type { IndexSearchToolFormData } from '../types/tool_form_types';
import { sharedValidationSchemas } from './shared_tool_validation';
import { useOnechatServices } from '../../../../hooks/use_onechat_service';

const indexSearchI18nMessages = {
  pattern: {
    requiredError: i18n.translate('xpack.onechat.tools.indexPattern.pattern.requiredError', {
      defaultMessage: 'Pattern is required.',
    }),
    trailingCommaError: i18n.translate(
      'xpack.onechat.tools.indexPattern.pattern.trailingCommaError',
      {
        defaultMessage: 'Pattern cannot end with a comma. Add another pattern or remove the comma.',
      }
    ),
    noMatchesError: i18n.translate('xpack.onechat.tools.indexPattern.pattern.noMatchesError', {
      defaultMessage: 'No matches found for this pattern.',
    }),
    apiError: i18n.translate('xpack.onechat.tools.indexPattern.pattern.error', {
      defaultMessage: 'Error loading index patterns.',
    }),
  },
};

export const useIndexSearchToolFormValidationResolver = (): Resolver<IndexSearchToolFormData> => {
  const { toolsService } = useOnechatServices();

  return useCallback(
    async (data) => {
      try {
        const values = await indexSearchFormValidationSchema(toolsService).parseAsync(data);
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
    },
    [toolsService]
  );
};

const indexSearchFormValidationSchema = (toolsService: any) =>
  z.object({
    toolId: sharedValidationSchemas.toolId,
    description: sharedValidationSchemas.description,
    labels: sharedValidationSchemas.labels,

    // Index Search specific validation with async target checking
    pattern: z
      .string()
      .min(1, { message: indexSearchI18nMessages.pattern.requiredError })
      .regex(/^(?!.*,$).+$/, { message: indexSearchI18nMessages.pattern.trailingCommaError })
      .refine(
        async (pattern) => {
          if (!pattern || !pattern.trim()) {
            return true; // Let required validation handle empty values
          }

          try {
            const response = await toolsService.resolveSearchSources({ pattern });
            return response.total > 0;
          } catch {
            // If API call fails, we'll show an API error instead of no matches
            throw new Error(indexSearchI18nMessages.pattern.apiError);
          }
        },
        { message: indexSearchI18nMessages.pattern.noMatchesError }
      ),

    type: z.literal(ToolType.index_search),
  });
