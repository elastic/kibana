/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const getConnectorSpecParamsSchema = schema.object({
  id: schema.string({
    minLength: 1,
    meta: {
      description: 'The connector type identifier.',
    },
  }),
});

export const getConnectorSpecResponseBodySchema = schema.object({
  metadata: schema.object(
    {
      id: schema.string({
        meta: {
          description: 'The connector type identifier (same shape as an action type id).',
        },
      }),
      displayName: schema.string({
        meta: {
          description: 'Human-readable label for this connector type.',
        },
      }),
      description: schema.string({
        meta: {
          description: 'Short summary of what this connector type is used for.',
        },
      }),
      minimumLicense: schema.string({
        meta: {
          description: 'Minimum Elastic license tier required to use this connector type.',
        },
      }),
      supportedFeatureIds: schema.arrayOf(schema.string(), {
        maxSize: 100,
        meta: {
          description:
            'Kibana feature identifiers this connector type supports (for example alerting or workflows).',
        },
      }),
      icon: schema.maybe(
        schema.string({
          meta: {
            description: 'Optional icon key or URL for this connector type in the UI.',
          },
        })
      ),
      docsUrl: schema.maybe(
        schema.string({
          meta: {
            description: 'Optional link to documentation for this connector type.',
          },
        })
      ),
      isTechnicalPreview: schema.maybe(
        schema.boolean({
          meta: {
            description: 'When true, this connector type is offered as a technical preview.',
          },
        })
      ),
    },
    {
      meta: {
        description: 'Passthrough of connector spec metadata from `@kbn/connector-specs`',
      },
    }
  ),
  schema: schema.recordOf(schema.string(), schema.any(), {
    meta: {
      description:
        'JSON Schema envelope for the connector form (top-level `config` and `secrets` shapes)',
    },
  }),
});
