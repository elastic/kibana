/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { badRequest, notFound } from '@hapi/boom';
import {
  InvestigationNotFoundError,
  InvestigationSubjectMissingError,
} from '../client/investigations_client';
import { MAX_KEYWORD_LENGTH } from '../saved_objects';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const ensureInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/investigations/{id}/_ensure',
  options: {
    access: 'internal',
    summary: 'Ensure the investigation record for a workflow execution exists',
    description:
      'Creates the investigation saved object for a workflow execution if it does not exist yet. ' +
      'Called by the first step of the investigation workflow so every run is tracked regardless ' +
      'of how it was triggered. All attributes derive from the execution document, never from the request.',
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
  }),
  handler: async ({ request, params, getInvestigationsClient }) => {
    const client = getInvestigationsClient(request);
    try {
      await client.ensureSavedObject(params.path.id);
    } catch (error) {
      if (error instanceof InvestigationNotFoundError) {
        throw notFound(error.message);
      }
      if (error instanceof InvestigationSubjectMissingError) {
        throw badRequest(error.message);
      }
      throw error;
    }
    return { acknowledged: true };
  },
});
