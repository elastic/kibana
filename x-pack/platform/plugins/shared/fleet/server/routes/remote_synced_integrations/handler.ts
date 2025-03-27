/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { RequestHandler } from '@kbn/core/server';

import type { GetRemoteSyncedIntegrationsStatusRequestSchema } from '../../types';

import type { GetRemoteSyncedIntegrationsStatusResponse } from '../../../common/types';

import { getRemoteSyncedIntegrationsStatus } from '../../tasks/sync_integrations/sync_integrations_on_remote';

export const getRemoteSyncedIntegrationsStatusHandler: RequestHandler<
  TypeOf<typeof GetRemoteSyncedIntegrationsStatusRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  try {
    const res: GetRemoteSyncedIntegrationsStatusResponse = await getRemoteSyncedIntegrationsStatus(
      esClient,
      soClient,
      request.params.outputId
    );

    return response.ok({ body: res });
  } catch (error) {
    throw error;
  }
};
