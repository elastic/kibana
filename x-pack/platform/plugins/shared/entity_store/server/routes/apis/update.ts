/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { buildStrictRouteValidationWithZod } from './utils/build_strict_route_validation';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import {
  LogExtractionByTypeSchema,
  LogExtractionUpdadeSchema,
} from './utils/log_extraction_validator';
import {
  collectAdditionalIndexPatterns,
  enforceEntityStorePrivileges,
} from './utils/check_entity_store_privileges';
import { EntityTypeNotInstalledError } from '../../domain/errors';

const bodySchema = z
  .object({
    logExtraction: LogExtractionUpdadeSchema.optional(),
    logExtractionByType: LogExtractionByTypeSchema,
  })
  .refine(
    ({ logExtraction, logExtractionByType }) =>
      logExtraction !== undefined || logExtractionByType !== undefined,
    { message: 'at least one of logExtraction or logExtractionByType is required' }
  );

export function registerUpdate(router: EntityStorePluginRouter) {
  router.versioned
    .put({
      path: ENTITY_STORE_ROUTES.public.UPDATE,
      access: 'public',
      summary: 'Update the Entity Store',
      description: 'Update the Entity Store log extraction configuration.',
      options: {
        tags: ['oas-tag:Security entity store'],
      },
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildStrictRouteValidationWithZod(bodySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/entity_store_update.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const {
          logsExtractionClient,
          assetManagerClient: assetManager,
          logger,
        } = await ctx.entityStore;
        logger.debug('Update api called');

        const { logExtraction, logExtractionByType } = req.body;

        const forbidden = await enforceEntityStorePrivileges(
          assetManager,
          req,
          res,
          collectAdditionalIndexPatterns(logExtraction, logExtractionByType)
        );
        if (forbidden) return forbidden;

        try {
          await logsExtractionClient.updateConfig(logExtraction, logExtractionByType);
        } catch (error) {
          if (error instanceof EntityTypeNotInstalledError) {
            return res.badRequest({ body: { message: error.message } });
          }
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return res.notFound({ body: { message: 'Entity store is not installed' } });
          }
          logger.error(error);
          throw error;
        }

        return res.ok({
          body: {
            ok: true,
          },
        });
      })
    );
}
