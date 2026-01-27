/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ToolType } from '@kbn/agent-builder-common/tools';
import { z } from '@kbn/zod';
import { sharedValidationSchemas } from './shared_tool_validation';
import type { ToolsService } from '../../../../../services';

const indexSearchI18nMessages = {
  pattern: {
    requiredError: i18n.translate('xpack.agentBuilder.tools.indexPattern.pattern.requiredError', {
      defaultMessage: 'Pattern is required.',
    }),
    noMatchesError: i18n.translate('xpack.agentBuilder.tools.indexPattern.pattern.noMatchesError', {
      defaultMessage: 'No matches found for this pattern.',
    }),
    apiError: i18n.translate('xpack.agentBuilder.tools.indexPattern.pattern.error', {
      defaultMessage: 'Error loading index patterns.',
    }),
  },
  defaultRowLimit: {
    invalidError: i18n.translate(
      'xpack.agentBuilder.tools.indexPattern.defaultRowLimit.invalidError',
      {
        defaultMessage: 'Default row limit must be bigger than 0.',
      }
    ),
  },
};

export const createIndexSearchFormValidationSchema = (toolsService: ToolsService) =>
  z.object({
    toolId: sharedValidationSchemas.toolId,
    description: sharedValidationSchemas.description,
    labels: sharedValidationSchemas.labels,

    pattern: z
      .string()
      .min(1, { message: indexSearchI18nMessages.pattern.requiredError })
      .refine(
        async (pattern) => {
          if (!pattern || !pattern.trim()) {
            return true;
          }
          try {
            const response = await toolsService.resolveSearchSources({ pattern });
            return response.total > 0;
          } catch {
            return false;
          }
        },
        { message: indexSearchI18nMessages.pattern.noMatchesError }
      ),

    rowLimit: z
      .number()
      .min(1, { message: indexSearchI18nMessages.defaultRowLimit.invalidError })
      .optional()
      .default(100),

    customInstructions: z.string().optional(),

    type: z.literal(ToolType.index_search),
  });
