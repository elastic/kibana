/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import {
  getConnectorSpecsResponseBodySchemaV1,
  type GetConnectorSpecsResponseV1,
} from '../../../../common/routes/connector/apis/get_specs';
import type { ActionsRequestHandlerContext } from '../../../types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import type { ILicenseState } from '../../../lib';
import type { ActionsConfigurationUtilities } from '../../../actions_config';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { transformGetConnectorSpecResponseV1 } from '../get_spec/transforms';

/**
 * GET /internal/actions/connector_types/specs
 *
 * Returns serialized metadata, per-action input JSON Schema, and per-event JSON
 * Schema for every registered spec-based connector type.
 */
export const getConnectorSpecsRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  configurationUtilities: ActionsConfigurationUtilities
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/specs`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: 'Get connector type specifications catalog',
        description:
          'Returns metadata, action input JSON Schema, and event JSON Schema for every registered spec-based connector type.',
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
        const types = await actionsClient.listTypes();
        const specTypes = types.filter((type) => type.source === ACTION_TYPE_SOURCES.spec);
        const responseBody: GetConnectorSpecsResponseV1 = [];

        for (const type of specTypes) {
          try {
            const specResult = await actionsClient.getConnectorSpec({
              id: type.id,
              configurationUtilities,
            });
            responseBody.push(transformGetConnectorSpecResponseV1(specResult));
          } catch {
            // Skip types whose spec cannot be loaded or serialized.
          }
        }

        return res.ok({ body: responseBody });
      })
    )
  );
};
