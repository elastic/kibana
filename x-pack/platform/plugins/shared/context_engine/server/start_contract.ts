/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  ContextEnginePluginStart,
  ContextEngineStartDependencies,
  ContextEngineIndexAttachmentParams,
  ContextEngineDeleteAttachmentParams,
} from './types';
import type { ContextEngineService } from './services/context_engine/types';

interface StartContractDeps {
  contextEngineService: ContextEngineService;
  elasticsearch: CoreStart['elasticsearch'];
  savedObjects: CoreStart['savedObjects'];
  spaces: ContextEngineStartDependencies['spaces'];
  logger: Logger;
}

/**
 * Builds `ContextEnginePluginStart.indexAttachment`, translating public
 * request-scoped params into the internal `ContextEngineIndexerParams` shape.
 *
 * `createdAt`/`permissions` are folded in after `base` rather than included
 * in it because they're content-mode-only; hoisting them into `base` would
 * make them reachable from the origin-mode branch too.
 */
export const buildIndexAttachment =
  ({ contextEngineService, elasticsearch, savedObjects, spaces, logger }: StartContractDeps) =>
  async (
    params: ContextEngineIndexAttachmentParams
  ): ReturnType<ContextEnginePluginStart['indexAttachment']> => {
    const soClient = savedObjects.getScopedClient(params.request, {
      ...(params.includedHiddenTypes?.length
        ? { includedHiddenTypes: params.includedHiddenTypes }
        : {}),
    });
    const spaceId =
      params.spaceId ?? spaces?.spacesService?.getSpaceId(params.request) ?? 'default';
    const base = {
      originId: params.originId,
      attachmentType: params.attachmentType,
      action: params.action,
      spaces: [spaceId],
      esClient: elasticsearch.client.asInternalUser,
      savedObjectsClient: soClient,
      logger,
    };
    if (params.content !== undefined) {
      return contextEngineService.indexAttachment({
        ...base,
        content: params.content,
        ...(params.createdAt !== undefined ? { createdAt: params.createdAt } : {}),
        ...(params.permissions !== undefined ? { permissions: params.permissions } : {}),
      });
    }
    return contextEngineService.indexAttachment({ ...base, force: params.force });
  };

/**
 * Builds `ContextEnginePluginStart.deleteAttachment` — same
 * request-to-internal-params translation as {@link buildIndexAttachment},
 * for the dedicated delete path that lets callers choose which
 * `ingestionMethod` scope to wipe.
 */
export const buildDeleteAttachment =
  ({ contextEngineService, elasticsearch, savedObjects, spaces, logger }: StartContractDeps) =>
  async (
    params: ContextEngineDeleteAttachmentParams
  ): ReturnType<ContextEnginePluginStart['deleteAttachment']> => {
    const soClient = savedObjects.getScopedClient(params.request, {
      ...(params.includedHiddenTypes?.length
        ? { includedHiddenTypes: params.includedHiddenTypes }
        : {}),
    });
    const spaceId =
      params.spaceId ?? spaces?.spacesService?.getSpaceId(params.request) ?? 'default';
    return contextEngineService.deleteAttachment({
      originId: params.originId,
      attachmentType: params.attachmentType,
      spaces: [spaceId],
      esClient: elasticsearch.client.asInternalUser,
      savedObjectsClient: soClient,
      logger,
      ...(params.ingestionMethod !== undefined ? { ingestionMethod: params.ingestionMethod } : {}),
    });
  };
