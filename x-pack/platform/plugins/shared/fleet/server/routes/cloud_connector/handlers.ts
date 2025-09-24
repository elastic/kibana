/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloudConnectorService } from '../../services';
import type { FleetRequestHandler } from '../../types';
import { appContextService } from '../../services/app_context';
import type {
  CloudConnectorVars,
  CloudProvider,
} from '../../../common/types/models/cloud_connector';

export interface CreateCloudConnectorRequest {
  name: string;
  vars: CloudConnectorVars;
  cloudProvider: CloudProvider;
}

export const createCloudConnectorHandler: FleetRequestHandler<
  undefined,
  undefined,
  CreateCloudConnectorRequest
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const logger = appContextService
    .getLogger()
    .get('CloudConnectorService createCloudConnectorHandler');

  try {
    logger.info('Creating cloud connector');
    const cloudConnector = await cloudConnectorService.create(internalSoClient, request.body);
    logger.info('Successfully created cloud connector');
    return response.ok({ body: cloudConnector });
  } catch (error) {
    logger.error('Failed to create cloud connector', error.message);
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
  { page?: string; perPage?: string }
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const { page, perPage } = request.query;
  const logger = appContextService
    .getLogger()
    .get('CloudConnectorService getCloudConnectorsHandler');

  try {
    logger.info('Getting cloud connectors list');
    const cloudConnectors = await cloudConnectorService.getList(internalSoClient, {
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });

    logger.info('Successfully retrieved cloud connectors list');
    return response.ok({ body: cloudConnectors });
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
