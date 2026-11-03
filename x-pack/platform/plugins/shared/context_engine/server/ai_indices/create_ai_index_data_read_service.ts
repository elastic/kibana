/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksStart, Logger } from '@kbn/core/server';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { GetAiIndexDataReadServiceParams } from '../types';
import type { SpaceIdResolver } from '../utils/resolve_space_id';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { AiIndexDataReadService } from './data_read_service';
import type { AiIndexService } from './service';

/**
 * Builds the caller-scoped AI index read service factory: the space comes from the request, the audit
 * logger and the memory setting are the caller's. Both Kibana and a task pod provide what it needs.
 */
export const createAiIndexDataReadServiceFactory = ({
  coreStart,
  spaces,
  aiIndexService,
  logger,
}: {
  coreStart: Pick<CoreTasksStart, 'savedObjects' | 'uiSettings' | 'security'>;
  spaces: SpaceIdResolver | undefined;
  aiIndexService: AiIndexService;
  logger: Logger;
}) => {
  return ({ esClient, request }: GetAiIndexDataReadServiceParams): AiIndexDataReadService =>
    new AiIndexDataReadService({
      esClient,
      spaceId: resolveSpaceId(spaces, request),
      auditLogger: coreStart.security.audit.asScoped(request),
      aiIndexService,
      logger,
      isMemoryEnabled: async () => {
        const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
        const globalUiSettings = coreStart.uiSettings.globalAsScopedToClient(savedObjectsClient);
        return (
          (await globalUiSettings.get<boolean>(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID)) ?? false
        );
      },
    });
};
