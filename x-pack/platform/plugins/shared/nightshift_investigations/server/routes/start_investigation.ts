/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { alertInvestigationContextSchema, freeFormContextSchema } from '../../common';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

const subjectIdAndSummary = {
  id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
  summary: z.string().max(MAX_TEXT_LENGTH).optional(),
};

export const startInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations',
  options: {
    access: 'internal',
    summary: 'Start an investigation',
    description: 'Triggers an investigation workflow for a given subject.',
  },
  security: {
    // agentBuilder:write is used as a proxy for "this user is authorized to spend AI tokens."
    // The investigation workflow itself creates the Agent Builder conversation — the calling user
    // does not create it directly — so this is not a strict AB permission requirement. We use
    // agentBuilder:write because it is the best available signal that a user has been granted
    // access to AI-resource-consuming features in this deployment. When conversation templates
    // land with their own privilege model, this should be revisited.
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    // A union rather than one object with a loose `context`, so that an alert investigation
    // cannot be started without the alert data it is supposed to reason about. zod's
    // discriminatedUnion needs the discriminator at the top level, and ours is nested under
    // `subject`, hence a plain union.
    //
    // The context schemas come from `common/schemas`, the same declarations the client validates
    // against, so an HTTP caller and a workflow step are held to one contract.
    body: z.union([
      z.object({
        subject: z.object({
          type: z.literal('alert'),
          ...subjectIdAndSummary,
        }),
        concurrency_key: z.string().max(MAX_KEYWORD_LENGTH).optional(),
        context: alertInvestigationContextSchema,
      }),
      z.object({
        subject: z.object({
          type: z.literal('significant_event'),
          ...subjectIdAndSummary,
        }),
        concurrency_key: z.string().max(MAX_KEYWORD_LENGTH).optional(),
        context: freeFormContextSchema.optional(),
      }),
    ]),
  }),
  handler: async ({ request, params, getInvestigationsClient }) => {
    const client = getInvestigationsClient(request);
    // User-initiated starts are always manual.
    try {
      return await client.start({
        ...params.body,
        trigger_type: 'manual',
      });
    } catch (error) {
      rethrowInvestigationClientError(error);
    }
  },
});
