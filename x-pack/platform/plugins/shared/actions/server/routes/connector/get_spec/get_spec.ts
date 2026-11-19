/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import {
  type GetConnectorSpecParamsV1,
  getConnectorSpecParamsSchemaV1,
} from '../../../../common/routes/connector/apis/get_spec';
import {
  getConnectorSpecResponseBodySchemaV1,
  type GetConnectorSpecResponseV1,
} from '../../../../common/routes/connector/response';
import type { ActionsRequestHandlerContext } from '../../../types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import type { ILicenseState } from '../../../lib';
import type { ActionsConfigurationUtilities } from '../../../actions_config';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { transformGetConnectorSpecResponseV1 } from './transforms';

/**
 * GET /internal/actions/connector_types/{id}/spec
 *
 * Returns the serialized connector spec as JSON Schema for client-side
 * form generation and validation.
 *
 * Only available for connector types with source === 'spec'.
 */
export const getConnectorSpecRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  configurationUtilities: ActionsConfigurationUtilities
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/{id}/spec`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: 'Get connector type specification',
        description:
          'Returns metadata and JSON Schema for a connector type form (config + secrets). Only available for spec-based connectors.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: getConnectorSpecParamsSchemaV1,
        },
        response: {
          200: {
            description: 'Connector specification returned successfully.',
            body: () => getConnectorSpecResponseBodySchemaV1,
          },
          404: {
            description: 'Connector type not found or not spec-based.',
          },
          500: {
            description: 'Internal server error.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const { id }: GetConnectorSpecParamsV1 = req.params;
        const specResult = await actionsClient.getConnectorSpec({
          id,
          configurationUtilities,
        });
        const responseBody: GetConnectorSpecResponseV1 =
          transformGetConnectorSpecResponseV1(specResult);
        return res.ok({ body: responseBody });
      })
    )
  );
};
