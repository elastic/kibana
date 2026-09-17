/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import {
  getConnectorSpecsResponseBodySchemaV1,
  type GetConnectorSpecsResponseV1,
} from '../../../../common/routes/connector/apis/get_specs';
import type { ActionsRequestHandlerContext } from '../../../types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import type { ILicenseState } from '../../../lib';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { transformGetConnectorSpecsResponseV1 } from './transforms';

/**
 * GET /internal/actions/connector_types/specs
 *
 * Returns serialized metadata, per-action input JSON Schema, and per-event JSON
 * Schema for every spec-based connector type.
 */
export const getConnectorSpecsRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/specs`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: 'Get connector type specifications catalog',
        description:
          'Returns metadata, action input JSON Schema, and event JSON Schema for every spec-based connector type.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {},
        response: {
          200: {
            description: 'Connector specification catalog returned successfully.',
            body: () => getConnectorSpecsResponseBodySchemaV1,
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
        const specResult = await actionsClient.getConnectorSpecs();
        const responseBody: GetConnectorSpecsResponseV1 =
          transformGetConnectorSpecsResponseV1(specResult);
        return res.ok({ body: responseBody });
      })
    )
  );
};
