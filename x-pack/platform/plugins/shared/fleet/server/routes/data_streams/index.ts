/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'path';

import { schema } from '@kbn/config-schema';

import type { FleetAuthzRouter } from '../../services/security';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { API_VERSIONS } from '../../../common/constants';

import { DATA_STREAM_API_ROUTES } from '../../constants';
import { DeprecatedILMPolicyCheckResponseSchema } from '../../../common/types/rest_spec/data_stream';
import { genericErrorResponse } from '../schema/errors';

import { getListHandler, getDeprecatedILMCheckHandler, getHasDataHandler } from './handlers';

export const ListDataStreamsResponseSchema = schema.object({
  data_streams: schema.arrayOf(
    schema.object({
      index: schema.string(),
      dataset: schema.string(),
      namespace: schema.string(),
      type: schema.string(),
      package: schema.string(),
      package_version: schema.string(),
      last_activity_ms: schema.number(),
      size_in_bytes: schema.number(),
      size_in_bytes_formatted: schema.oneOf([schema.number(), schema.string()]),
      dashboards: schema.arrayOf(
        schema.object({
          id: schema.string(),
          title: schema.string(),
        }),
        { maxSize: 10000 }
      ),
      serviceDetails: schema.nullable(
        schema.object({
          environment: schema.string(),
          serviceName: schema.string(),
        })
      ),
    }),
    { maxSize: 10000 }
  ),
});

export const registerRoutes = (router: FleetAuthzRouter) => {
  // List of data streams
  router.versioned
    .get({
      path: DATA_STREAM_API_ROUTES.LIST_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            FLEET_API_PRIVILEGES.AGENTS.ALL,
            FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL,
            FLEET_API_PRIVILEGES.SETTINGS.ALL,
          ],
        },
      },
      summary: `Get data streams`,
      description:
        'List all Fleet-managed data streams with metadata including package, namespace, size, and last activity.',
      options: {
        tags: ['oas-tag:Data streams'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/get_data_streams.yaml'),
        },
        validate: {
          request: {},
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => ListDataStreamsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getListHandler
    );

  // Check if data streams have data
  router.versioned
    .get({
      path: DATA_STREAM_API_ROUTES.HAS_DATA_PATTERN,
      security: {
        authz: {
          // Read-only: the handler runs a search and mutates nothing. Index-level access is
          // additionally enforced by Elasticsearch, since the query runs as the current user —
          // the handler converts an ES security_exception into a 403 rather than "no data".
          requiredPrivileges: [FLEET_API_PRIVILEGES.FLEET.READ],
        },
      },
      summary: 'Check if data streams have data',
      description:
        'Check whether one or more data stream index patterns contain any documents indexed at or after the given start time.',
      options: {
        availability: {
          since: '9.6.0',
          stability: 'stable',
        },
        tags: ['oas-tag:Data streams'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/get_data_streams_has_data.yaml'),
        },
        validate: {
          request: {
            query: schema.object({
              // maxLength caps the fan-out of the msearch built from this list (one sub-query
              // per pattern).
              dataStreams: schema.string({
                maxLength: 4096,
                meta: {
                  description:
                    'A comma-separated list of data stream index patterns to check. Each pattern must be of the form `logs-<dataset>-*` or `metrics-<dataset>-*`.',
                },
              }),
              start: schema.string({
                maxLength: 64,
                meta: {
                  description:
                    'An ISO 8601 timestamp. Only documents with an `@timestamp` at or after this time are considered.',
                },
                validate: (value) =>
                  Number.isNaN(Date.parse(value))
                    ? `start must be a valid ISO8601 timestamp, got "${value}"`
                    : undefined,
              }),
            }),
          },
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () =>
                schema.object({
                  results: schema.recordOf(schema.string(), schema.boolean(), {
                    meta: {
                      description:
                        'One entry per requested index pattern. `true` when the pattern matched at least one document, `false` when it matched none or the pattern resolved to no index.',
                    },
                  }),
                }),
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getHasDataHandler
    );

  // Check for deprecated ILM policies
  router.versioned
    .get({
      path: DATA_STREAM_API_ROUTES.DEPRECATED_ILM_CHECK_PATTERN,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [
            FLEET_API_PRIVILEGES.AGENTS.ALL,
            FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL,
            FLEET_API_PRIVILEGES.SETTINGS.ALL,
          ],
        },
      },
      summary: `Check if Fleet-managed component templates are using deprecated ILM policies that require manual migration`,
      description:
        'Check if any Fleet-managed component templates are still using deprecated ILM policies that require manual migration to data stream lifecycle policies.',
      options: {
        tags: ['internal', 'oas-tag:Data streams'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => DeprecatedILMPolicyCheckResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getDeprecatedILMCheckHandler
    );
};
