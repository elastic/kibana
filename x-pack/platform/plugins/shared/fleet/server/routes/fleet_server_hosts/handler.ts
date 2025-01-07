/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { RequestHandler, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isEqual } from 'lodash';

import { SERVERLESS_DEFAULT_FLEET_SERVER_HOST_ID } from '../../constants';

import { FleetServerHostUnauthorizedError } from '../../errors';
import { agentPolicyService, appContextService } from '../../services';

import {
  createFleetServerHost,
  deleteFleetServerHost,
  getFleetServerHost,
  listFleetServerHosts,
  updateFleetServerHost,
} from '../../services/fleet_server_host';
import type {
  GetOneFleetServerHostRequestSchema,
  PostFleetServerHostRequestSchema,
  PutFleetServerHostRequestSchema,
} from '../../types';

async function checkFleetServerHostsWriteAPIsAllowed(
  soClient: SavedObjectsClientContract,
  hostUrls: string[]
) {
  const cloudSetup = appContextService.getCloud();
  if (!cloudSetup?.isServerlessEnabled) {
    return;
  }

  // Fleet Server hosts must have the default host URL in serverless.
  const serverlessDefaultFleetServerHost = await getFleetServerHost(
    soClient,
    SERVERLESS_DEFAULT_FLEET_SERVER_HOST_ID
  );
  if (!isEqual(hostUrls, serverlessDefaultFleetServerHost.host_urls)) {
    throw new FleetServerHostUnauthorizedError(
      `Fleet server host must have default URL in serverless: ${serverlessDefaultFleetServerHost.host_urls}`
    );
  }
}

export const postFleetServerHost: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostFleetServerHostRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  // In serverless, allow create fleet server host if host url is same as default.
  await checkFleetServerHostsWriteAPIsAllowed(soClient, request.body.host_urls);

  const { id, ...data } = request.body;
  const FleetServerHost = await createFleetServerHost(
    soClient,
    { ...data, is_preconfigured: false },
    { id }
  );
  if (FleetServerHost.is_default) {
    await agentPolicyService.bumpAllAgentPolicies(esClient);
  }

  const body = {
    item: FleetServerHost,
  };

  return response.ok({ body });
};

export const getFleetServerHostHandler: RequestHandler<
  TypeOf<typeof GetOneFleetServerHostRequestSchema.params>
> = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    const item = await getFleetServerHost(soClient, request.params.itemId);
    const body = {
      item,
    };

    return response.ok({ body });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Fleet server ${request.params.itemId} not found` },
      });
    }

    throw error;
  }
};

export const deleteFleetServerHostHandler: RequestHandler<
  TypeOf<typeof GetOneFleetServerHostRequestSchema.params>
> = async (context, request, response) => {
  try {
    const coreContext = await context.core;
    const soClient = coreContext.savedObjects.client;
    const esClient = coreContext.elasticsearch.client.asInternalUser;

    await deleteFleetServerHost(soClient, esClient, request.params.itemId);
    const body = {
      id: request.params.itemId,
    };

    return response.ok({ body });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Fleet server ${request.params.itemId} not found` },
      });
    }

    throw error;
  }
};

export const putFleetServerHostHandler: RequestHandler<
  TypeOf<typeof PutFleetServerHostRequestSchema.params>,
  undefined,
  TypeOf<typeof PutFleetServerHostRequestSchema.body>
> = async (context, request, response) => {
  try {
    const coreContext = await await context.core;
    const esClient = coreContext.elasticsearch.client.asInternalUser;
    const soClient = coreContext.savedObjects.client;

    // In serverless, allow update fleet server host if host url is same as default.
    if (request.body.host_urls) {
      await checkFleetServerHostsWriteAPIsAllowed(soClient, request.body.host_urls);
    }

    const item = await updateFleetServerHost(soClient, request.params.itemId, request.body);
    const body = {
      item,
    };

    if (item.is_default) {
      await agentPolicyService.bumpAllAgentPolicies(esClient);
    } else {
      await agentPolicyService.bumpAllAgentPoliciesForFleetServerHosts(esClient, item.id);
    }

    return response.ok({ body });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Fleet server ${request.params.itemId} not found` },
      });
    }

    throw error;
  }
};

export const getAllFleetServerHostsHandler: RequestHandler = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  const res = await listFleetServerHosts(soClient);
  const body = {
    items: res.items,
    page: res.page,
    perPage: res.perPage,
    total: res.total,
  };

  return response.ok({ body });
};
