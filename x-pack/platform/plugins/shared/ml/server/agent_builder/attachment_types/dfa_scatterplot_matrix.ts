/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { DFA_SCATTERPLOT_MATRIX_ATTACHMENT_TYPE } from './constants';

const fieldName = lazySchema(() => z.string().min(1).max(256));

const dfaScatterplotMatrixSchema = lazySchema(() =>
  z.object({
    job_id: z.string().min(1).max(64),
    analysis_type: z.enum(['outlier_detection', 'regression', 'classification']),
    index: z.string().min(1).max(256),
    results_field: z.string().min(1).max(64).optional(),
    dependent_variable: fieldName.optional(),
    includes: z.array(fieldName).max(50).optional(),
    excludes: z.array(fieldName).max(50).optional(),
  })
);

export type DfaScatterplotMatrixAttachmentData = z.infer<typeof dfaScatterplotMatrixSchema>;

/** Scatterplot matrix of numeric fields on a data frame analytics destination index. */
export const createDfaScatterplotMatrixAttachmentType = (): AttachmentTypeDefinition<
  typeof DFA_SCATTERPLOT_MATRIX_ATTACHMENT_TYPE,
  DfaScatterplotMatrixAttachmentData
> => ({
  id: DFA_SCATTERPLOT_MATRIX_ATTACHMENT_TYPE,

  validate: (input) => {
    const result = dfaScatterplotMatrixSchema.safeParse(input);
    if (result.success) return { valid: true, data: result.data };
    return { valid: false, error: result.error.message };
  },

  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text' as const,
      value: `Scatterplot matrix for data frame analytics job ${attachment.data.job_id}`,
    }),
  }),

  isReadonly: true,

  getAgentDescription: () =>
    'A scatterplot matrix for one data frame analytics results index. When ml.dfa_get_job returns scatterplot_attachment.render, copy that tag into the reply. The job id in the chart links to the results explorer. Do not call attachments.read for this chart.',

  getTools: () => [],
});
