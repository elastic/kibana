/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_INBOX_URL, MAX_OWNER_LENGTH } from '../../../../common/constants';
import type { InboxFindResponse } from '../../../../common/types/api/inbox/v1';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

const MAX_INBOX_OWNERS = 10;

export const findInboxRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_INBOX_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    query: schema.object({
      owner: schema.maybe(
        schema.oneOf([
          schema.arrayOf(schema.string({ maxLength: MAX_OWNER_LENGTH }), {
            maxSize: MAX_INBOX_OWNERS,
          }),
          schema.string({ maxLength: MAX_OWNER_LENGTH }),
        ])
      ),
    }),
  },
  routerOptions: { access: 'internal' },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      const { owner } = request.query as { owner?: string | string[] };
      const owners = owner == null ? [] : Array.isArray(owner) ? owner : [owner];
      const body: InboxFindResponse = await casesClient.attachments.findInbox({ owners });

      return response.ok({ body });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find the inbox in route: ${error}`,
        error,
      });
    }
  },
});
