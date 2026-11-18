/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ConnectorSpecSummary } from '../../../../common/connector_spec';
import type { GetAllConnectorTypesResponseV1 } from '../../../../common/routes/connector/response';
import type { ConnectorTypesRequestQueryV1 } from '../../../../common/routes/connector/apis/connector_types';
import { connectorTypesQuerySchemaV1 } from '../../../../common/routes/connector/apis/connector_types';
import type { ActionsRequestHandlerContext } from '../../../types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import type { ILicenseState } from '../../../lib';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { transformListTypesResponseV1 } from '../list_types/transforms';

export const listTypesWithSystemRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  getConnectorSpecSummaries: () => ConnectorSpecSummary[]
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector_types`,
      security: {
        authz: {
          enabled: false,
          reason: 'This internal API does not require any Kibana feature privileges.',
        },
      },
      validate: {
        query: connectorTypesQuerySchemaV1,
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();

        // Assert versioned inputs
        const query: ConnectorTypesRequestQueryV1 = req.query;

        const connectorTypes = await actionsClient.listTypes({
          featureId: query?.feature_id,
          includeSystemActionTypes: true,
        });

        // Spec-backed types also carry the display data the UI needs, which the registry rows lack.
        const specs = new Map(getConnectorSpecSummaries().map((spec) => [spec.id, spec]));
        const responseBody: Array<
          GetAllConnectorTypesResponseV1[number] & { icon?: string; is_ears_experimental?: boolean }
        > = transformListTypesResponseV1(connectorTypes).map((type) => {
          const spec = specs.get(type.id);
          return spec
            ? {
                ...type,
                ...(spec.icon !== undefined ? { icon: spec.icon } : {}),
                is_ears_experimental: spec.isEarsExperimental,
              }
            : type;
        });

        return res.ok({ body: responseBody });
      })
    )
  );
};
