/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { DFA_TOTAL_FEATURE_IMPORTANCE_ATTACHMENT_TYPE } from './constants';

const importanceSummarySchema = lazySchema(() =>
  z.object({
    max: z.number(),
    min: z.number(),
    mean_magnitude: z.number(),
  })
);

const regressionFeatureSchema = lazySchema(() =>
  z.object({
    feature_name: z.string().min(1).max(1024),
    importance: importanceSummarySchema,
  })
);

const classificationFeatureSchema = lazySchema(() =>
  z.object({
    feature_name: z.string().min(1).max(1024),
    classes: z
      .array(
        z.object({
          class_name: z.union([z.string().max(1024), z.number(), z.boolean()]),
          importance: importanceSummarySchema,
        })
      )
      .min(1)
      .max(100),
  })
);

const dfaTotalFeatureImportanceSchema = lazySchema(() =>
  z.object({
    job_id: z.string().min(1).max(64),
    analysis_type: z.enum(['classification', 'regression']).optional(),
    total_feature_importance: z
      .array(z.union([classificationFeatureSchema, regressionFeatureSchema]))
      .min(1)
      .max(100),
  })
);

export type DfaTotalFeatureImportanceAttachmentData = z.infer<
  typeof dfaTotalFeatureImportanceSchema
>;

/** Total feature importance bar chart for a finished classification or regression job. */
export const createDfaTotalFeatureImportanceAttachmentType = (): AttachmentTypeDefinition<
  typeof DFA_TOTAL_FEATURE_IMPORTANCE_ATTACHMENT_TYPE,
  DfaTotalFeatureImportanceAttachmentData
> => ({
  id: DFA_TOTAL_FEATURE_IMPORTANCE_ATTACHMENT_TYPE,

  validate: (input) => {
    const result = dfaTotalFeatureImportanceSchema.safeParse(input);
    if (result.success) return { valid: true, data: result.data };
    return { valid: false, error: result.error.message };
  },

  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text' as const,
      value: `Total feature importance chart for data frame analytics job ${attachment.data.job_id}`,
    }),
  }),

  isReadonly: true,

  getAgentDescription: () =>
    'The total feature importance chart for one classification or regression job. When ml.dfa_get_job returns chart_attachment.render, copy that tag into the reply. That tag is the chart. Do not build another feature importance chart from total_feature_importance or from per-row samples. Do not call attachments.read. Omit the chart when chart_attachment is absent.',

  getTools: () => [],
});
