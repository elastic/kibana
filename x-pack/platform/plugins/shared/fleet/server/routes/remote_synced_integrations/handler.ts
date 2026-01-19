/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type { GetRemoteSyncedIntegrationsStatusResponse } from '../../../common/types';
import { getRemoteSyncedIntegrationsStatus } from '../../tasks/sync_integrations/compare_synced_integrations';
import type { GetRemoteSyncedIntegrationsInfoRequestSchema } from '../../types';
import { getRemoteSyncedIntegrationsInfoByOutputId } from '../../tasks/sync_integrations/get_remote_status';

export const getRemoteSyncedIntegrationsStatusHandler: RequestHandler<undefined> = async (
  context,
  request,
  response
) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  try {
    const res: GetRemoteSyncedIntegrationsStatusResponse = await getRemoteSyncedIntegrationsStatus(
      esClient,
      soClient
    );

    return response.ok({ body: res });
  } catch (error) {
    throw error;
  }
};

export const getRemoteSyncedIntegrationsInfoHandler: RequestHandler<
  TypeOf<typeof GetRemoteSyncedIntegrationsInfoRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  try {
    const res: GetRemoteSyncedIntegrationsStatusResponse =
      await getRemoteSyncedIntegrationsInfoByOutputId(soClient, request.params.outputId);
    return response.ok({ body: res });
  } catch (error) {
    throw error;
  }
};
