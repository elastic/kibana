/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIndexPattern } from '@kbn/context-engine-plugin/common/ai_index_dest';
import type { AiIndexHttpItem } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import type { CoreStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';

export const getWritableMemoryAiIndex = async ({
  aiIndexId,
  spaceId,
  request,
  getAiIndexService,
  getCoreStart,
}: {
  aiIndexId: string;
  spaceId: string;
  request: KibanaRequest;
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
}): Promise<AiIndexHttpItem> => {
  const coreStart = await getCoreStart();
  const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
  const globalUiSettings = coreStart.uiSettings.globalAsScopedToClient(savedObjectsClient);
  const memoryEnabled = await globalUiSettings.get<boolean>(
    CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID
  );
  const aiIndex = await (await getAiIndexService()).get(aiIndexId, spaceId);

  if (!memoryEnabled) {
    throw new Error('Context Engine memory is not enabled.');
  }
  if (!aiIndex.memory_enabled) {
    throw new Error(`AI index '${aiIndexId}' does not have memory enabled.`);
  }
  if (isIndexPattern(aiIndex.dest.value)) {
    throw new Error(
      `AI index '${aiIndexId}' uses an index pattern and cannot accept memory writes.`
    );
  }

  return aiIndex;
};
