/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import {
  INTERNAL_CASE_ROOM_POST_URL,
  INTERNAL_CASE_ROOM_URL,
} from '../../../../../common/constants';
import type { ActionSource } from '../../../../../common/types/domain';
import type { CasesClient } from '../../../../client';
import { createCaseError } from '../../../../common/error';
import { createCasesRoute } from '../../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../../constants';

const caseIdParams = schema.object({ case_id: schema.string({ minLength: 1, maxLength: 512 }) });

export const ensureCaseRoomRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_CASE_ROOM_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: { params: caseIdParams },
  routerOptions: { access: 'internal' },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      return response.ok({ body: await casesClient.cases.ensureRoom(request.params.case_id) });
    } catch (error) {
      throw createCaseError({
        message: `Failed to open the room of case ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});

export const createPostFromRoomRoute = (
  getCasesClientAs: (request: KibanaRequest, actionSource: ActionSource) => Promise<CasesClient>
) =>
  createCasesRoute({
    method: 'post',
    path: INTERNAL_CASE_ROOM_POST_URL,
    security: DEFAULT_CASES_ROUTE_SECURITY,
    params: {
      params: caseIdParams,
      body: schema.object({
        event_id: schema.string({ minLength: 1, maxLength: 512 }),
      }),
    },
    routerOptions: { access: 'internal' },
    handler: async ({ context, request, response }) => {
      try {
        const casesClient = await (await context.cases).getCasesClient();
        const body = request.body as { event_id: string };
        return response.ok({
          body: await casesClient.cases.postFromRoom(request.params.case_id, body, (source) =>
            getCasesClientAs(request, source)
          ),
        });
      } catch (error) {
        throw createCaseError({
          message: `Failed to post a room message to case ${request.params.case_id}: ${error}`,
          error,
        });
      }
    },
  });
