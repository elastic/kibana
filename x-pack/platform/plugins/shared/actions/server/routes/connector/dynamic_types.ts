/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { z, lazySchema } from '@kbn/zod/v4';
import type { IRouter } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../common';
import {
  connectorTypeIconSchema,
  createConnectorTypeRequestSchemaV1,
  requestTemplateSchema,
} from '../../../common/routes/connector/apis/create_type';
import type { ILicenseState } from '../../lib';
import type { ActionsRequestHandlerContext } from '../../types';
import { verifyAccessAndContext } from '../verify_access_and_context';

const editableSchema = lazySchema(() =>
  z
    .object({
      displayName: z.string().min(1).max(512),
      description: z.string().max(1000),
      icon: connectorTypeIconSchema.optional(),
      testEnabled: z.boolean(),
      test: z
        .object({
          description: z.string().max(1000).optional(),
          request: requestTemplateSchema,
        })
        .strict()
        .optional(),
    })
    .strict()
    .superRefine(({ testEnabled, test }, context) => {
      if (testEnabled && !test) {
        context.addIssue({
          code: 'custom',
          path: ['test'],
          message: 'A connection test definition is required when testEnabled is true.',
        });
      }
      if (!testEnabled && test) {
        context.addIssue({
          code: 'custom',
          path: ['test'],
          message: 'A disabled connection test cannot include a test definition.',
        });
      }
    })
);
const listSchema = schema.arrayOf(
  schema.object({
    id: schema.string(),
    name: schema.string(),
    description: schema.maybe(schema.string()),
    icon: schema.maybe(schema.string()),
  })
);

export const dynamicConnectorTypesRoutes = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/{id}/definition`,
      security: { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } },
      options: { access: 'internal', summary: 'Get dynamic connector type definition' },
      validate: {
        request: { params: schema.object({ id: schema.string({ maxLength: 127 }) }) },
        response: { 200: { body: () => createConnectorTypeRequestSchemaV1 } },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async (context, request, response) => {
        const actions = await context.actions;
        return response.ok({
          body: actions.getDynamicConnectorTypeDefinition(request.params.id),
        });
      })
    )
  );

  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/dynamic`,
      security: { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } },
      options: {
        access: 'internal',
        summary: 'Get dynamic connector types',
        tags: ['oas-tag:connectors'],
      },
      validate: { request: {}, response: { 200: { body: () => listSchema } } },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async (context, _request, response) => {
        const actions = await context.actions;
        const types = actions
          .listDynamicConnectorTypes()
          .map(({ id, name, description, icon }) => ({
            id,
            name,
            ...(description ? { description } : {}),
            ...(icon ? { icon } : {}),
          }));
        return response.ok({ body: types });
      })
    )
  );

  router.put(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/{id}/editable`,
      security: { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } },
      options: {
        access: 'internal',
        summary: 'Update dynamic connector type metadata and connection test',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: schema.object({ id: schema.string({ maxLength: 127 }) }),
          body: editableSchema,
        },
        response: { 200: { body: () => schema.object({ id: schema.string() }) } },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async (context, request, response) => {
        const actions = await context.actions;
        actions.updateDynamicConnectorTypeEditable(request.params.id, request.body);
        return response.ok({ body: { id: request.params.id } });
      })
    )
  );
};
