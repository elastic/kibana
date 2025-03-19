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
import { getFollowerIndexInfo } from '../../tasks/sync_integrations_on_remote';
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
    const info = await getFollowerIndexInfo(esClient, request.params.outputId);

    const body: GetOneRemoteSyncedIntegrationsResponse = {
      item: {},
    };

    return response.ok({ body });
  } catch (error) {
    throw error;
  }
};
