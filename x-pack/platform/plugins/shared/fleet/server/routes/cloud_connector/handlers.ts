/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import {
  cloudConnectorService,
  agentPolicyService,
  createAgentPolicyWithCloudConnector,
} from '../../services';
import type { FleetRequestHandler } from '../../types';
import { appContextService } from '../../services/app_context';
import { HTTPAuthorizationHeader } from '../../../common/http_authorization_header';
import type {
  GetCloudConnectorsResponse,
  GetOneCloudConnectorResponse,
  CreateCloudConnectorResponse,
  UpdateCloudConnectorResponse,
  DeleteCloudConnectorResponse,
  CreateAgentPolicyWithCloudConnectorResponse,
} from '../../../common/types/rest_spec/cloud_connector';
import type {
  CreateCloudConnectorRequestSchema,
  GetCloudConnectorRequestSchema,
  GetCloudConnectorsRequestSchema,
  UpdateCloudConnectorRequestSchema,
  DeleteCloudConnectorRequestSchema,
  CreateAgentPolicyWithCloudConnectorRequestSchema,
} from '../../types/rest_spec/cloud_connector';

export const createCloudConnectorHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateCloudConnectorRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const logger = appContextService
    .getLogger()
    .get('CloudConnectorService createCloudConnectorHandler');

  try {
    logger.info('Creating cloud connector');
    const cloudConnector = await cloudConnectorService.create(internalSoClient, request.body);
    logger.info(`Successfully created cloud connector ${cloudConnector.id}`);
    const body: CreateCloudConnectorResponse = {
      item: cloudConnector,
    };
    return response.ok({ body });
  } catch (error) {
    logger.error(`Failed to create cloud connector`, error.message);
    return response.customError({
      statusCode: 400,
      body: {
        message: error.message,
      },
    });
  }
};

export const getCloudConnectorsHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetCloudConnectorsRequestSchema.query>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const { page, perPage, cloudProvider } = request.query;
  const logger = appContextService
    .getLogger()
    .get('CloudConnectorService getCloudConnectorsHandler');

  try {
    logger.info('Getting cloud connectors list');
    const cloudConnectors = await cloudConnectorService.getList(internalSoClient, {
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });

    // Filter by cloudProvider if provided
    const filteredConnectors = cloudProvider
      ? cloudConnectors.filter((connector) => connector.cloudProvider === cloudProvider)
      : cloudConnectors;

    logger.info('Successfully retrieved cloud connectors list');
    const body: GetCloudConnectorsResponse = {
      items: filteredConnectors,
    };
    return response.ok({ body });
  } catch (error) {
    logger.error('Failed to get cloud connectors list', error.message);
    return response.customError({
      statusCode: 400,
      body: {
        message: error.message,
      },
    });
  }
};

export const getCloudConnectorHandler: FleetRequestHandler<
  TypeOf<typeof GetCloudConnectorRequestSchema.params>,
  undefined
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const cloudConnectorId = request.params.cloudConnectorId;
  const logger = appContextService
    .getLogger()
    .get('CloudConnectorService getCloudConnectorHandler');

  try {
    logger.info(`Getting cloud connector ${cloudConnectorId}`);
    const result = await cloudConnectorService.getById(internalSoClient, cloudConnectorId);
    logger.info(`Successfully retrieved cloud connector ${cloudConnectorId}`);
    const body: GetOneCloudConnectorResponse = {
      item: result,
    };
    return response.ok({ body });
  } catch (error) {
    logger.error(`Failed to get cloud connector ${cloudConnectorId}`, error.message);
    return response.customError({
      statusCode: 400,
      body: {
        message: error.message,
      },
    });
  }
};

export const updateCloudConnectorHandler: FleetRequestHandler<
  TypeOf<typeof UpdateCloudConnectorRequestSchema.params>,
  undefined,
  TypeOf<typeof UpdateCloudConnectorRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const cloudConnectorId = request.params.cloudConnectorId;
  const logger = appContextService
    .getLogger()
    .get('CloudConnectorService updateCloudConnectorHandler');

  try {
    logger.info(`Updating cloud connector ${cloudConnectorId}`);
    const result = await cloudConnectorService.update(
      internalSoClient,
      cloudConnectorId,
      request.body as any // Schema validation already passed
    );
    logger.info(`Successfully updated cloud connector ${cloudConnectorId}`);
    const body: UpdateCloudConnectorResponse = {
      item: result,
    };
    return response.ok({ body });
  } catch (error) {
    logger.error(`Failed to update cloud connector ${cloudConnectorId}`, error.message);
    return response.customError({
      statusCode: 400,
      body: {
        message: error.message,
      },
    });
  }
};

export const deleteCloudConnectorHandler: FleetRequestHandler<
  TypeOf<typeof DeleteCloudConnectorRequestSchema.params>,
  TypeOf<typeof DeleteCloudConnectorRequestSchema.query>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const cloudConnectorId = request.params.cloudConnectorId;
  const force = request.query.force || false;
  const logger = appContextService
    .getLogger()
    .get('CloudConnectorService deleteCloudConnectorHandler');

  try {
    logger.info(`Deleting cloud connector ${cloudConnectorId} (force: ${force})`);
    const result = await cloudConnectorService.delete(internalSoClient, cloudConnectorId, force);
    logger.info(`Successfully deleted cloud connector ${cloudConnectorId}`);
    const body: DeleteCloudConnectorResponse = {
      id: result.id,
    };
    return response.ok({ body });
  } catch (error) {
    logger.error(`Failed to delete cloud connector ${cloudConnectorId}`, error.message);

    return response.customError({
      statusCode: 400,
      body: {
        message: error.message,
      },
    });
  }
};

export const createCloudConnectorWithPackagePolicyHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof CreateAgentPolicyWithCloudConnectorRequestSchema.query>,
  TypeOf<typeof CreateAgentPolicyWithCloudConnectorRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const spaceId = fleetContext.spaceId;
  const logger = appContextService
    .getLogger()
    .get('httpCreateCloudConnectorWithPackagePolicyHandler');

  const {
    cloud_connector: cloudConnectorRequest,
    package_policy: packagePolicyRequest,
    force,
    ...newPolicy
  } = request.body;

  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request, user?.username);

  logger.debug(
    `Creating cloud connector [${cloudConnectorRequest.name}] with agent policy [${newPolicy.name}] and package policy [${packagePolicyRequest.name}]`
  );

  try {
    const result = await createAgentPolicyWithCloudConnector({
      soClient,
      esClient,
      agentPolicyService,
      newPolicy,
      cloudConnectorRequest,
      packagePolicyRequest,
      spaceId,
      user,
      authorizationHeader,
      force,
    });

    logger.info(
      `Successfully created cloud connector [${result.cloudConnectorId}] with agent policy [${result.agentPolicyId}] and package policy [${result.packagePolicyId}]`
    );

    const body: CreateAgentPolicyWithCloudConnectorResponse = {
      item: {
        agent_policy_id: result.agentPolicyId,
        cloud_connector_id: result.cloudConnectorId,
        package_policy_id: result.packagePolicyId,
      },
    };

    return response.ok({ body });
  } catch (error) {
    logger.error(
      `Failed to create cloud connector with package policy: ${error.message}`,
      error.stack
    );

    if (error.statusCode) {
      return response.customError({
        statusCode: error.statusCode,
        body: { message: error.message },
      });
    }

    return response.customError({
      statusCode: 500,
      body: {
        message: `Failed to create cloud connector with package policy: ${error.message}`,
      },
    });
  }
};
