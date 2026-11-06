/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type { ActionsRequestHandlerContext } from '../../../types';
import type { ILicenseState } from '../../../lib';
import { BASE_ACTION_API_PATH } from '../../../../common';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import {
  createConnectorTypeRequestSchemaV1,
  createConnectorTypeResponseSchemaV1,
} from '../../../../common/routes/connector/apis/create_type';

/** Registers a connector type in this Kibana process only. */
export const createConnectorTypeRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ACTION_API_PATH}/connector_types`,
      security: { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } },
      options: {
        access: 'public',
        summary: 'Create a connector type',
        description:
          'Registers a connector type in this Kibana process only. It is not persisted, is lost on restart, and is not shared with other Kibana nodes.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: { body: createConnectorTypeRequestSchemaV1 },
        response: {
          200: {
            description: 'Connector type registered.',
            body: () => createConnectorTypeResponseSchemaV1,
          },
          409: { description: 'Connector type already exists.' },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async (context, req, res) => {
        const actionsClient = (await context.actions).getActionsClient();
        const result = await actionsClient.createConnectorType({
          request: req.body,
        });
        return res.ok({ body: result });
      })
    )
  );
};
