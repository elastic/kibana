/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INBOX_ACTIONS_URL,
  INTERNAL_API_ACCESS,
  ListInboxActionsRequestQuery,
  type ListInboxActionsResponse,
} from '@kbn/inbox-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { STUB_INBOX_ACTIONS } from './stub_actions';

export const registerListInboxActionsRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: INBOX_ACTIONS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'List inbox actions',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(ListInboxActionsRequestQuery),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { status, source_app: sourceApp, page, per_page: perPage } = request.query;

          // Deferred: replace with real storage adapter / ES reader once the
          // HITL action schema stabilizes.
          const filtered = STUB_INBOX_ACTIONS.filter((action) => {
            if (status && action.status !== status) return false;
            if (sourceApp && action.source_app !== sourceApp) return false;
            return true;
          });

          const start = (page - 1) * perPage;
          const end = start + perPage;
          const body: ListInboxActionsResponse = {
            actions: filtered.slice(start, end),
            total: filtered.length,
          };

          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to list inbox actions: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list inbox actions' },
          });
        }
      }
    );
};
