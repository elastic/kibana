/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UIOpen,
  UIOpenOption,
  UPGRADE_ASSISTANT_DOC_ID,
  UPGRADE_ASSISTANT_TYPE,
} from '../../../../common/types';
import { RequestShim, ServerShim } from '../../types';

async function incrementUIOpenOptionCounter(server: ServerShim, uiOpenOptionCounter: UIOpenOption) {
  const { getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);

  await internalRepository.incrementCounter(
    UPGRADE_ASSISTANT_TYPE,
    UPGRADE_ASSISTANT_DOC_ID,
    `ui_open.${uiOpenOptionCounter}`
  );
}

export async function upsertUIOpenOption(server: ServerShim, req: RequestShim): Promise<UIOpen> {
  const { overview, cluster, indices } = req.payload as UIOpen;

  if (overview) {
    await incrementUIOpenOptionCounter(server, 'overview');
  }

  if (cluster) {
    await incrementUIOpenOptionCounter(server, 'cluster');
  }

  if (indices) {
    await incrementUIOpenOptionCounter(server, 'indices');
  }

  return {
    overview,
    cluster,
    indices,
  };
}
