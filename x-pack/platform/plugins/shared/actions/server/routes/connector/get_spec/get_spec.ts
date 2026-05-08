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
import type { ActionsConfigurationUtilities } from '../../../actions_config';
import { verifyAccessAndContext } from '../../verify_access_and_context';

// Pre-index specs by ID for O(1) lookup
const specsByIdMap = new Map(
  Object.values(connectorsSpecs).map((spec) => [spec.metadata.id, spec])
);

// `authz.enabled: false` matches other connector metadata routes (e.g. `list_types.ts`); the
// handler still runs through `verifyAccessAndContext` for license and request context checks.

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
      security: {
        authz: {
          enabled: false,
          reason:
            'This API returns connector type metadata and does not require Kibana feature privileges.',
        },
      },
      options: {
        access: 'internal',
        summary: 'Get connector type specification',
        description:
          'Returns metadata and JSON Schema for a connector type form (config + secrets). Only available for spec-based connectors.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          // Unversioned: internal-only route; version request/response when this API is promoted or stabilized.
          params: schema.object({
            id: schema.string({ minLength: 1 }),
          }),
        },
        response: {
          200: {
            description: 'Connector specification returned successfully.',
            body: () =>
              schema.object({
                metadata: schema.object({
                  id: schema.string(),
                  displayName: schema.string(),
                  description: schema.string(),
                  minimumLicense: schema.string(),
                  supportedFeatureIds: schema.arrayOf(schema.string(), { maxSize: 100 }),
                  icon: schema.maybe(schema.string()),
                  docsUrl: schema.maybe(schema.string()),
                  isTechnicalPreview: schema.maybe(schema.boolean()),
                }),
                schema: schema.recordOf(schema.string(), schema.any(), {
                  meta: {
                    description:
                      'JSON Schema envelope for the connector form (top-level `config` and `secrets` shapes), not a Kibana config-schema object.',
                  },
                }),
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
          const webhookSettings = configurationUtilities.getWebhookSettings();
          const isPfxEnabled = webhookSettings.ssl.pfx.enabled;
          const isEarsEnabled = configurationUtilities.isEarsEnabled();
          return res.ok({
            body: serializeConnectorSpec(spec, { isPfxEnabled, isEarsEnabled }),
          });
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
