/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { BuildFlavor } from '@kbn/config';
import { schema } from '@kbn/config-schema';
import { type IRouter, type Logger, ReservedPrivilegesSet } from '@kbn/core/server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '@kbn/deeplinks-analytics/constants';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { defineKeyRotationRoutes } from './key_rotation';
import type { ConfigType } from '../config';
import type { EncryptionKeyRotationService } from '../crypto';
import type { ClientInstanciator } from '../saved_objects';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  router: IRouter;
  logger: Logger;
  config: ConfigType;
  encryptionKeyRotationService: PublicMethodsOf<EncryptionKeyRotationService>;
  buildFlavor: BuildFlavor;
  getClient: ClientInstanciator;
}

export function defineRoutes(params: RouteDefinitionParams) {
  defineKeyRotationRoutes(params);
  defineTestRoutes(params);
}

export function defineTestRoutes({
  encryptionKeyRotationService,
  router,
  logger,
  config,
  buildFlavor,
  getClient,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/api/encrypted_saved_objects/_test_decrypt_unsupported_type/{id}',
      validate: {
        params: schema.object({ id: schema.string({ minLength: 1, maxLength: 1024 }) }),
      },
      security: {
        authz: {
          requiredPrivileges: [ReservedPrivilegesSet.superuser],
        },
      },
      options: {
        access: 'public',
      },
    },
    async (context, request, response) => {
      try {
        const id = request.params.id;
        const esoClient = getClient({});
        await esoClient.getDecryptedAsInternalUser(DASHBOARD_SAVED_OBJECT_TYPE, id);
      } catch (err) {
        logger.error(err);
        return response.customError({ body: err, statusCode: 500 });
      }
      return response.ok();
    }
  );

  router.post(
    {
      path: '/api/encrypted_saved_objects/_test_pit_unsupported_type',
      validate: {},
      security: {
        authz: {
          requiredPrivileges: [ReservedPrivilegesSet.superuser],
        },
      },
      options: {
        access: 'public',
      },
    },
    async (context, request, response) => {
      try {
        const esoClient = getClient({});
        await esoClient.createPointInTimeFinderDecryptedAsInternalUser({
          type: DASHBOARD_SAVED_OBJECT_TYPE,
        });
      } catch (err) {
        logger.error(err);
        return response.customError({ body: err, statusCode: 500 });
      }
      return response.ok();
    }
  );
}
