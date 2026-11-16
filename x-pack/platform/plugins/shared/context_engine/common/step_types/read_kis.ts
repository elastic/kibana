/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import { MAX_KI_CONTENT_LENGTH } from '../constants';
import { aiIndexIdSchema, kiIdSchema } from './ki';

export const READ_KIS_STEP_ID = 'context-engine.readKis' as const;

export const MAX_READ_KIS = 100;
export const DEFAULT_READ_KI_CONTENT_LENGTH = 8000;

export const readKisInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    ids: z
      .union([kiIdSchema, z.array(kiIdSchema).max(MAX_READ_KIS)])
      .describe('The ids of the KIs to read: one, or a list'),
    max_content_length: z
      .number()
      .int()
      .min(1)
      .max(MAX_KI_CONTENT_LENGTH)
      .optional()
      .describe(
        `At most how many characters of each KI's content to return. Defaults to ${DEFAULT_READ_KI_CONTENT_LENGTH}.`
      ),
  })
);

export const readKisOutputSchema = lazySchema(() =>
  z.object({
    kis: z
      .array(
        z
          .object({
            id: z.string(),
            type: z.string(),
            title: z.string(),
            description: z.string().optional(),
            content: z.string().optional(),
            updated_at: z.string().optional(),
          })
          .passthrough()
      )
      .describe(
        'The KIs that are active and visible in this space, in the order asked for; others are left out. Content leaves out the access patterns section dreaming renders.'
      ),
  })
);

export type ReadKisOutput = z.infer<typeof readKisOutputSchema>;

export const readKisStepCommonDefinition: CommonStepDefinition<
  typeof readKisInputSchema,
  typeof readKisOutputSchema
> = {
  id: READ_KIS_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.readKis.label', {
    defaultMessage: 'Read knowledge items',
  }),
  description: i18n.translate('xpack.contextEngine.workflows.steps.readKis.description', {
    defaultMessage: 'Read the current revision of knowledge items of an AI index by id.',
  }),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: readKisInputSchema,
  outputSchema: readKisOutputSchema,
  documentation: {
    details: i18n.translate('xpack.contextEngine.workflows.steps.readKis.documentation.details', {
      defaultMessage:
        'Returns the current revision of each KI that is active, not expired and visible in the ' +
        'space of the workflow. Deleted, expired and hidden KIs are left out.',
    }),
  },
};
