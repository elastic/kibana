/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import { INTERNAL_ENSURE_SYSTEM_TEMPLATES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import type { EnsureSystemTemplatesResult } from '../../../system_templates';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

const bodySchema = schema.object({ owner: schema.string({ minLength: 1, maxLength: 100 }) });

const parseOwner = (body: unknown): string => {
  try {
    return bodySchema.validate(body).owner;
  } catch (error) {
    throw Boom.badRequest(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Writes the owner's shipped templates into the caller's space if they are missing, for spaces
 * created after Kibana started. The write runs as the internal user and only ever writes the
 * registered shipped content, so the caller just needs to be able to read the owner's templates;
 * the statuses are only added for a caller who can change the owner's Cases settings.
 */
export const createEnsureSystemTemplatesRoute = ({
  ensureForSpace,
  getSpaceId,
}: {
  ensureForSpace: (
    spaceId: string,
    owner: string,
    options: { addStatuses: boolean }
  ) => Promise<EnsureSystemTemplatesResult>;
  getSpaceId: (request: KibanaRequest) => string;
}) =>
  createCasesRoute({
    method: 'post',
    path: INTERNAL_ENSURE_SYSTEM_TEMPLATES_URL,
    security: DEFAULT_CASES_ROUTE_SECURITY,
    routerOptions: {
      access: 'internal',
      summary: "Add the owner's shipped templates to this space if they are missing",
    },
    handler: async ({ context, request, response }) => {
      try {
        // Validated here rather than through `params` so the route keeps the untyped shape the
        // internal route list expects.
        const owner = parseOwner(request.body);
        const casesClient = await (await context.cases).getCasesClient();
        if (!(await casesClient.templates.canReadOwnerTemplates(owner))) {
          throw Boom.forbidden(`Unauthorized to read ${owner} templates`);
        }
        // The template's statuses change the owner's Cases settings, so only a settings admin
        // adds them here; the start-time pass adds them for everyone else.
        const addStatuses = await casesClient.templates.canUpdateOwnerConfiguration(owner);
        const result = await ensureForSpace(getSpaceId(request), owner, { addStatuses });
        return response.ok({ body: result });
      } catch (error) {
        throw createCaseError({
          message: `Failed to add shipped templates in route: ${error}`,
          error,
        });
      }
    },
  });
