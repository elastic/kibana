/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { concat, from, map, of, switchMap, takeWhile, timer } from 'rxjs';
import type { InvestigationStatusEvent } from '../../common';
import { InvestigationNotFoundError } from '../client/errors';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const POLL_INTERVAL_MS = 2_000;
type SerializableInvestigationStatusEvent = InvestigationStatusEvent & Record<string, unknown>;

const isTerminalStatus = (status: InvestigationStatusEvent['status']): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled';

const toStatusEvent = ({
  investigation_id,
  status,
}: Pick<
  InvestigationStatusEvent,
  'investigation_id' | 'status'
>): SerializableInvestigationStatusEvent => ({
  type: 'investigation_status',
  investigation_id,
  status,
});

export const followInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/investigations/{id}/follow',
  options: {
    access: 'internal',
    summary: 'Follow an investigation',
    description: 'Streams status updates until an investigation reaches a terminal state.',
  },
  security: {
    authz: {
      requiredPrivileges: ['agentBuilder:read'],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(500),
    }),
  }),
  handler: async ({ request, params, getInvestigationsClient }) => {
    const investigationClient = getInvestigationsClient(request);
    const getInvestigation = async () => {
      try {
        return await investigationClient.get(params.path.id);
      } catch (err) {
        if (err instanceof InvestigationNotFoundError) {
          throw notFound(err.message);
        }
        throw err;
      }
    };

    // Resolve the first state before returning the Observable so a missing investigation
    // produces an HTTP 404 instead of an SSE error after the response has started.
    const initialState = await getInvestigation();

    return concat(
      of(initialState),
      timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS).pipe(switchMap(() => from(getInvestigation())))
    ).pipe(
      map(toStatusEvent),
      takeWhile(({ status }) => !isTerminalStatus(status), true)
    );
  },
});
