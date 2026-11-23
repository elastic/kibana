/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { FleetRequestHandler } from '../../types';
import { fetchIndex, fetchSavedObjectNames, fetchSavedObjects } from '../../services/debug';
import { isDebugAuthorized } from '../../services/security';
import type {
  FetchIndexRequestSchema,
  FetchSavedObjectNamesRequestSchema,
  FetchSavedObjectsRequestSchema,
} from '../../types/rest_spec/debug';

const SUPERUSER_REQUIRED_BODY = {
  message: 'Debug routes require superuser privileges.',
};

export const fetchIndexHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof FetchIndexRequestSchema.body>
> = async (context, request, response) => {
  if (!isDebugAuthorized(request)) {
    return response.forbidden({ body: SUPERUSER_REQUIRED_BODY });
  }
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const { spaceId } = await context.fleet;
  const res = await fetchIndex(esClient, request.body.index, spaceId);
  return res.ok ? response.ok({ body: res.body }) : response.badRequest({ body: res.body });
};

export const fetchSavedObjectsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof FetchSavedObjectsRequestSchema.body>
> = async (context, request, response) => {
  if (!isDebugAuthorized(request)) {
    return response.forbidden({ body: SUPERUSER_REQUIRED_BODY });
  }
  const soClient = (await context.fleet).internalSoClient;
  const res = await fetchSavedObjects(soClient, request.body.type, request.body.name);
  return res.ok ? response.ok({ body: res.body }) : response.badRequest({ body: res.body });
};

export const fetchSavedObjectNamesHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof FetchSavedObjectNamesRequestSchema.body>
> = async (context, request, response) => {
  if (!isDebugAuthorized(request)) {
    return response.forbidden({ body: SUPERUSER_REQUIRED_BODY });
  }
  const soClient = (await context.fleet).internalSoClient;
  const res = await fetchSavedObjectNames(soClient, request.body.type);
  return res.ok ? response.ok({ body: res.body }) : response.badRequest({ body: res.body });
};
