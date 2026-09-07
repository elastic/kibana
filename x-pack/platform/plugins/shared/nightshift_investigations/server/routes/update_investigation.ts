/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_BLIND_SPOTS,
  MAX_HYPOTHESES,
  MAX_RECOMMENDATIONS,
  MAX_TRIGGER_FEEDBACK,
  MAX_TEXT_LENGTH,
  investigationBlindSpotSchema,
  investigationHypothesisSchema,
  investigationImpactSchema,
  investigationRecommendationSchema,
  severitySchema,
  triggerFeedbackSchema,
} from '@kbn/significant-events-schema';
import { UPDATABLE_INVESTIGATION_STATUSES } from '../../common';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

/**
 * Optional PATCH fields. Empty string is absent so quoted Liquid interpolations of missing
 * values (`severity: "${{ ... }}"`) do not fail enum/string validation with `""`.
 */
const orAbsent = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value: unknown) => (value === '' ? undefined : value),
    schema.nullish().transform((value): z.infer<T> | undefined => value ?? undefined)
  );

const updateInvestigationBodySchema = z.object({
  status: z.enum(UPDATABLE_INVESTIGATION_STATUSES),
  error: orAbsent(z.string().max(MAX_TEXT_LENGTH)),
  summary: orAbsent(z.string().max(MAX_TEXT_LENGTH)),
  conclusion: orAbsent(z.string().max(MAX_TEXT_LENGTH)),
  severity: orAbsent(severitySchema),
  hypotheses: orAbsent(z.array(investigationHypothesisSchema).max(MAX_HYPOTHESES)),
  recommendations: orAbsent(z.array(investigationRecommendationSchema).max(MAX_RECOMMENDATIONS)),
  blind_spots: orAbsent(z.array(investigationBlindSpotSchema).max(MAX_BLIND_SPOTS)),
  trigger_feedback: orAbsent(z.array(triggerFeedbackSchema).max(MAX_TRIGGER_FEEDBACK)),
  conversation_id: orAbsent(z.string().max(MAX_KEYWORD_LENGTH)),
  impact: orAbsent(investigationImpactSchema),
});

export const updateInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PATCH /internal/nightshift/investigations/{id}',
  options: {
    access: 'internal',
    summary: 'Update investigation state',
    description:
      'Updates the investigation record with structured output and/or terminal status. Called by workflow steps at completion.',
  },
  security: {
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
    body: updateInvestigationBodySchema,
  }),
  handler: async ({ request, params, getInvestigationsClient }) => {
    const client = getInvestigationsClient(request);
    try {
      await client.update(params.path.id, params.body);
    } catch (error) {
      rethrowInvestigationClientError(error);
    }
    return { acknowledged: true };
  },
});
