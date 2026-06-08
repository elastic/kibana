/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { FleetRequestHandler } from '../../types';
import type { GetCollectorGroupsRequestSchema } from '../../../common/types';
import { getCollectorGroups } from '../../services/agents/collector_groups';

export const getCollectorGroupsHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetCollectorGroupsRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const spaceId = fleetContext.spaceId;

  const { groupBy, kuery, perPage, afterKey, showInactive } = request.query;

  let parsedAfterKey: Record<string, string> | undefined;
  if (afterKey) {
    try {
      parsedAfterKey = JSON.parse(afterKey);
    } catch {
      return response.badRequest({ body: { message: 'Invalid afterKey: must be valid JSON' } });
    }
  }

  const body = await getCollectorGroups(esClient, soClient, {
    groupBy,
    kuery,
    perPage,
    afterKey: parsedAfterKey,
    spaceId,
    showInactive,
  });

  return response.ok({ body });
};
