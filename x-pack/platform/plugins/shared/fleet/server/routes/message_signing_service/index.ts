/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'path';

import { schema } from '@kbn/config-schema';

import type { FleetAuthzRouter } from '../../services/security';
import { API_VERSIONS } from '../../../common/constants';
import { MESSAGE_SIGNING_SERVICE_API_ROUTES } from '../../constants';
import { RotateKeyPairSchema } from '../../types';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { genericErrorResponse } from '../schema/errors';

import { rotateKeyPairHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // Rotate fleet message signing key pair
  router.versioned
    .post({
      path: MESSAGE_SIGNING_SERVICE_API_ROUTES.ROTATE_KEY_PAIR,
      security: {
        authz: {
          requiredPrivileges: [
            FLEET_API_PRIVILEGES.AGENTS.ALL,
            FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL,
            FLEET_API_PRIVILEGES.SETTINGS.ALL,
          ],
        },
      },
      summary: 'Rotate a Fleet message signing key pair',
      description:
        'Rotate the key pair used by Fleet to sign messages sent to Elastic Agents. This operation is irreversible and requires all agents in the Fleet to be re-enrolled after rotation. You must explicitly acknowledge the risk by passing `acknowledge=true` as a query parameter.',
      options: {
        tags: ['oas-tag:Message Signing Service'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/post_rotate_key_pair.yaml'),
        },
        validate: {
          request: RotateKeyPairSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () =>
                schema.object({
                  message: schema.string(),
                }),
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
            500: {
              description: 'An internal server error.',
              body: genericErrorResponse,
            },
          },
        },
      },
      rotateKeyPairHandler
    );
};
