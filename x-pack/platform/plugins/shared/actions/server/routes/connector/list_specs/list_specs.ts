/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import {
  getConnectorSpecSummariesResponseBodySchemaV1,
  type GetConnectorSpecSummariesResponseV1,
} from '../../../../common/routes/connector/response';
import type { ConnectorSpecSummary } from '../../../../common/connector_spec';
import type { ActionsRequestHandlerContext } from '../../../types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import type { ILicenseState } from '../../../lib';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';

/** GET /internal/actions/connector_types/specs: icon and flags of every spec-backed type. */
export const listSpecsRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  getConnectorSpecSummaries: () => ConnectorSpecSummary[]
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/specs`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: 'Get connector type spec summaries',
        description: 'Returns display data for spec-backed connector types.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {},
        response: {
          200: {
            description: 'Connector spec summaries returned successfully.',
            body: () => getConnectorSpecSummariesResponseBodySchemaV1,
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const responseBody: GetConnectorSpecSummariesResponseV1 = getConnectorSpecSummaries().map(
          ({ id, icon, isEarsExperimental }) => ({
            id,
            ...(icon !== undefined ? { icon } : {}),
            is_ears_experimental: isEarsExperimental,
          })
        );
        return res.ok({ body: responseBody });
      })
    )
  );
};
