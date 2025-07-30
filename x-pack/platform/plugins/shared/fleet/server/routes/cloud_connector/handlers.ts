/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloudConnectorService } from '../../services';
import type { FleetRequestHandler } from '../../types';
import type { PackagePolicy } from '../../../common/types/models/package_policy';

export const createCloudConnectorHandler: FleetRequestHandler<
  undefined,
  undefined,
  PackagePolicy
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const packagePolicy = request.body;

  try {
    const cloudConnector = await cloudConnectorService.create(internalSoClient, packagePolicy);
    return response.ok({ body: cloudConnector });
  } catch (error) {
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

  try {
    const cloudConnectors = await cloudConnectorService.getList(internalSoClient, {
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });

    return response.ok({ body: cloudConnectors });
  } catch (error) {
    return response.customError({
      statusCode: 400,
      body: {
        message: error.message,
      },
    });
  }
};