/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type { getOneRemoteSyncedIntegrationsRequestSchema } from '../../types';

import type { GetOneRemoteSyncedIntegrationsResponse } from '../../../common/types';
import { getFollowerIndexStats } from '../../tasks/sync_integrations_on_remote';
import { appContextService } from '../../services';

export const getRemoteSyncedIntegrationsInfoHandler: RequestHandler<
  TypeOf<typeof getOneRemoteSyncedIntegrationsRequestSchema.params>
> = async (context, request, response) => {
  const esClient = (await context.core).elasticsearch.client.asInternalUser;
  const { enableSyncIntegrationsOnRemote } = appContextService.getExperimentalFeatures();

  if (!enableSyncIntegrationsOnRemote) {
    return;
  }
  try {
    const stats = await getFollowerIndexStats(esClient, request.params.outputId);
    console.log('## stats', stats);

    const body: GetOneRemoteSyncedIntegrationsResponse = {
      item: {},
    };

    return response.ok({ body });
  } catch (error) {
    // if (error.isBoom && error.output.statusCode === 404) {
    //   return response.notFound({
    //     body: { message: `Synced integrations with outputId ${request.params.outputId} not found` },
    //   });
    // }

    throw error;
  }
};
