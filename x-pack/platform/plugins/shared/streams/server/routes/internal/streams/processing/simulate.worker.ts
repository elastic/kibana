/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteWorker } from '@kbn/core-worker-threads-server';
import { getAssetClientWithRequest } from '../../../../lib/streams/assets/asset_service';
import { getStreamsClientWithRequest } from '../../../../lib/streams/service';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { DefinitionNotFoundError } from '../../../../lib/streams/errors/definition_not_found_error';
import { simulateProcessing } from './simulation_handler';

const worker: RouteWorker<
  {
    name: string;
    body: string;
  },
  {}
> = {
  run: async ({ input, request, core, signal, logger }) => {
    const scopedClusterClient = (await core.elasticsearch).client;

    const assetClient = getAssetClientWithRequest({
      logger,
      request,
      savedObjectsClient: (await core.savedObjects).client,
      scopedClusterClient: (await core.elasticsearch).client,
    });

    const streamsClient = getStreamsClientWithRequest({
      assetClient,
      isServerless: false,
      logger,
      request,
      scopedClusterClient: (await core.elasticsearch).client,
    });

    const documents = JSON.parse(input.body);

    const { read } = await checkAccess({ name: input.name, scopedClusterClient });
    if (!read) {
      throw new DefinitionNotFoundError(`Stream definition for ${input.name} not found.`);
    }

    return simulateProcessing({
      params: {
        body: documents,
        path: {
          name: input.name,
        },
      },
      scopedClusterClient,
      streamsClient,
    });
  },
};

export const run = worker.run;
