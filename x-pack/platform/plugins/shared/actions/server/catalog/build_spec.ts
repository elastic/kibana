/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionContext,
  AuthTypeDef,
  ConnectorMetadata,
  ConnectorSpec,
} from '@kbn/connector-specs';
import { authTypeSpecs } from '@kbn/connector-specs/server';
import { z } from '@kbn/zod/v4';
import { declarativeJsonSchemaToZod } from './json_schema';
import { executeDeclarativeRequest } from './runtime';
import type { CatalogContractSpec, TypeMetadataState } from './types';

const registeredAuthTypeIds = new Set(Object.values(authTypeSpecs).map(({ id }) => id));

const buildAuthTypes = (connector: CatalogContractSpec): Array<string | AuthTypeDef> => {
  return connector.auth.types.map((authType) => {
    const authTypeId = typeof authType === 'string' ? authType : authType.type;
    if (!registeredAuthTypeIds.has(authTypeId)) {
      throw new Error(
        `Declarative connector "${connector.id}" uses auth type "${authTypeId}", which is not registered in this Kibana version.`
      );
    }
    if (typeof authType === 'string') return authType;
    const { prefix: _prefix, ...authTypeDefinition } = authType;
    return authTypeDefinition;
  });
};

/** Builds the versioned contract portion of a ConnectorSpec (no type metadata). */
export const buildContract = (contract: CatalogContractSpec): Omit<ConnectorSpec, 'metadata'> => {
  const configSchema = declarativeJsonSchemaToZod(contract.config, 'config');
  if (!(configSchema instanceof z.ZodObject)) {
    throw new Error(`Declarative connector "${contract.id}" config must be an object schema.`);
  }
  const actions = Object.fromEntries(
    Object.entries(contract.actions).map(([actionId, action]) => [
      actionId,
      {
        description: action.description,
        isTool: action.isTool,
        scope: action.scope,
        input: declarativeJsonSchemaToZod(action.input, `actions.${actionId}.input`),
        handler: async (context: ActionContext, input: unknown) =>
          executeDeclarativeRequest({
            context,
            connector: contract,
            request: action.request,
            input: input as Record<string, unknown>,
          }),
      },
    ])
  ) as ConnectorSpec['actions'];

  return {
    auth: {
      types: buildAuthTypes(contract),
    },
    schema: configSchema,
    actions,
    test: {
      enabled: true,
      description: contract.test.description,
      handler: async (context) =>
        executeDeclarativeRequest({
          context,
          connector: contract,
          request: contract.test.request,
          input: {},
        }),
    },
  };
};

/** Attaches live type metadata (including the icon data URL) onto a built contract. */
export const withTypeMetadata = (
  id: string,
  built: Omit<ConnectorSpec, 'metadata'>,
  metadata: TypeMetadataState
): ConnectorSpec => ({
  ...built,
  metadata: {
    id,
    displayName: metadata.displayName,
    description: metadata.description,
    docsUrl: metadata.docsUrl,
    minimumLicense: metadata.minimumLicense,
    isTechnicalPreview: metadata.isTechnicalPreview,
    supportedFeatureIds: metadata.supportedFeatureIds as ConnectorMetadata['supportedFeatureIds'],
    ...(metadata.iconDataUrl ? { icon: metadata.iconDataUrl } : {}),
  },
});
