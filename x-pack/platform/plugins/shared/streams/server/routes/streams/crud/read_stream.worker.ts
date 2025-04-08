/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteWorker } from '@kbn/core-worker-threads-server';
import { isWorkerThread } from 'piscina';
import { getAssetClientWithRequest } from '../../../lib/streams/assets/asset_service';

const worker: RouteWorker<
  {
    name: string;
  },
  {
    isWorkerThread: boolean;
  }
> = {
  run: async ({ input, core: { elasticsearch, savedObjects, uiSettings }, signal, logger }) => {
    const assetClient = getAssetClientWithRequest({
      logger,
      scopedClusterClient: (await elasticsearch).client,
      savedObjectsClient: (await savedObjects).client,
      rulesClient: null,
    });

    const assets = await Promise.race([
      assetClient.getAssets({
        entityId: input.name,
        entityType: 'stream',
      }),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 1000);
      }),
    ]);

    logger.info(JSON.stringify(assets));

    return {
      isWorkerThread,
    };
  },
};

export const run = worker.run;
