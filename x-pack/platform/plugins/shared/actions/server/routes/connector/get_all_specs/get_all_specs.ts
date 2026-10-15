/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ConnectorTypesRequestQueryV1 } from '../../../../common/routes/connector/apis/connector_types';
import { connectorTypesQuerySchemaV1 } from '../../../../common/routes/connector/apis/connector_types';
import type { GetAllConnectorSpecsResponseV1 } from '../../../../common/routes/connector/response';
import { getAllConnectorSpecsResponseSchemaV1 } from '../../../../common/routes/connector/response';
import type { ActionsRequestHandlerContext } from '../../../types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import type { ILicenseState } from '../../../lib';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { transformGetAllConnectorSpecsResponseV1 } from './transforms';

/**
 * GET /internal/actions/connector_types/specs
 *
 * Returns summaries of spec-backed connector types, optionally filtered by feature.
 */
export const getAllConnectorSpecsRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/specs`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: 'Get connector type specifications',
        description:
          'Returns summaries of spec-backed connector types. Optionally filter by feature_id. Does not include form or action input schemas.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          query: connectorTypesQuerySchemaV1,
        },
        response: {
          200: {
            description: 'Connector type specifications returned successfully.',
            body: () => getAllConnectorSpecsResponseSchemaV1,
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const specsClient = (await context.actions).getSpecsClient();
        const query: ConnectorTypesRequestQueryV1 = req.query;
        const summaries = await specsClient.getAll({ featureId: query.feature_id });
        const responseBody: GetAllConnectorSpecsResponseV1 =
          transformGetAllConnectorSpecsResponseV1(summaries);
        return res.ok({ body: responseBody });
      })
    )
  );
};
