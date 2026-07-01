/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  AgentContextLayerPluginStart,
  AgentContextLayerStartDependencies,
  SmlIndexAttachmentParams,
  SmlDeleteAttachmentParams,
} from './types';
import type { SmlService } from './services/sml/types';

interface StartContractDeps {
  smlService: SmlService;
  elasticsearch: CoreStart['elasticsearch'];
  savedObjects: CoreStart['savedObjects'];
  spaces: AgentContextLayerStartDependencies['spaces'];
  logger: Logger;
}

/**
 * Builds `AgentContextLayerPluginStart.indexAttachment`, translating public
 * request-scoped params into the internal `SmlIndexerParams` shape.
 *
 * `createdAt`/`permissions` are folded in after `base` rather than included
 * in it because they're content-mode-only; hoisting them into `base` would
 * make them reachable from the origin-mode branch too.
 */
export const buildIndexAttachment =
  ({ smlService, elasticsearch, savedObjects, spaces, logger }: StartContractDeps) =>
  async (
    params: SmlIndexAttachmentParams
  ): ReturnType<AgentContextLayerPluginStart['indexAttachment']> => {
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
      return smlService.indexAttachment({
        ...base,
        content: params.content,
        ...(params.createdAt !== undefined ? { createdAt: params.createdAt } : {}),
        ...(params.permissions !== undefined ? { permissions: params.permissions } : {}),
      });
    }
    return smlService.indexAttachment({ ...base, force: params.force });
  };

/**
 * Builds `AgentContextLayerPluginStart.deleteAttachment` — same
 * request-to-internal-params translation as {@link buildIndexAttachment},
 * for the dedicated delete path that lets callers choose which
 * `ingestionMethod` scope to wipe.
 */
export const buildDeleteAttachment =
  ({ smlService, elasticsearch, savedObjects, spaces, logger }: StartContractDeps) =>
  async (
    params: SmlDeleteAttachmentParams
  ): ReturnType<AgentContextLayerPluginStart['deleteAttachment']> => {
    const soClient = savedObjects.getScopedClient(params.request, {
      ...(params.includedHiddenTypes?.length
        ? { includedHiddenTypes: params.includedHiddenTypes }
        : {}),
    });
    const spaceId =
      params.spaceId ?? spaces?.spacesService?.getSpaceId(params.request) ?? 'default';
    return smlService.deleteAttachment({
      originId: params.originId,
      attachmentType: params.attachmentType,
      spaces: [spaceId],
      esClient: elasticsearch.client.asInternalUser,
      savedObjectsClient: soClient,
      logger,
      ...(params.ingestionMethod !== undefined ? { ingestionMethod: params.ingestionMethod } : {}),
    });
  };
