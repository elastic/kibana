/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { connectorsSpecs, serializeConnectorSpec } from '@kbn/connector-specs';
import type { ActionsRequestHandlerContext } from '../../../types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import type { ILicenseState } from '../../../lib';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';

// Pre-index specs by ID for O(1) lookup
const specsByIdMap = new Map(
  Object.values(connectorsSpecs).map((spec) => [spec.metadata.id, spec])
);

/**
 * GET /api/actions/connector_types/{id}/spec
 *
 * Returns the serialized connector spec as JSON Schema for client-side
 * form generation and validation.
 *
 * Only available for connector types with source === 'spec'.
 */
export const getConnectorSpecRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/{id}/spec`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: 'Get connector type specification',
        description:
          'Returns metadata and JSON Schema for a connector type form (config + secrets). Only available for spec-based connectors.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          // TODO: needs to be versioned
          params: schema.object({
            id: schema.string({ minLength: 1 }),
          }),
        },
        response: {
          200: {
            description: 'Connector specification returned successfully.',
            body: () =>
              // TODO: version this
              // TODO: what about hideInUi and other fields available in the registry?
              schema.object({
                metadata: schema.object({
                  id: schema.string(),
                  displayName: schema.string(),
                  description: schema.string(),
                  minimumLicense: schema.string(),
                  supportedFeatureIds: schema.arrayOf(schema.string()),
                  icon: schema.maybe(schema.string()),
                  docsUrl: schema.maybe(schema.string()),
                }),
                schema: schema.recordOf(schema.string(), schema.any()),
              }),
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
        const { id } = req.params;

        const spec = specsByIdMap.get(id);

        if (!spec) {
          return res.notFound({
            body: { message: `Spec for connector type "${id}" not found.` },
          });
        }

        try {
          // TODO: version this
          return res.ok({ body: serializeConnectorSpec(spec) });
        } catch (error) {
          return res.customError({
            statusCode: 500,
            body: {
              message: `Failed to serialize connector spec: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      })
    )
  );
};
