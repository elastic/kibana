/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  AgentBuilderSmlPluginStart,
  AgentBuilderSmlStartDependencies,
  SmlIndexAttachmentParams,
  SmlDeleteAttachmentParams,
} from './types';
import type { SmlService } from './services/sml/types';

interface StartContractDeps {
  smlService: SmlService;
  elasticsearch: CoreStart['elasticsearch'];
  savedObjects: CoreStart['savedObjects'];
  spaces: AgentBuilderSmlStartDependencies['spaces'];
  logger: Logger;
}

/**
 * Builds `AgentBuilderSmlPluginStart.indexAttachment`, translating public
 * request-scoped params into the internal `SmlIndexerParams` shape.
 */
export const buildIndexAttachment =
  ({ smlService, elasticsearch, savedObjects, spaces, logger }: StartContractDeps) =>
  async (
    params: SmlIndexAttachmentParams
  ): ReturnType<AgentBuilderSmlPluginStart['indexAttachment']> => {
    const soClient = savedObjects.getScopedClient(params.request, {
      ...(params.includedHiddenTypes?.length
        ? { includedHiddenTypes: params.includedHiddenTypes }
        : {}),
    });
    const spaceId =
      params.spaceId ?? spaces?.spacesService?.getSpaceId(params.request) ?? 'default';
    return smlService.indexAttachment({
      originId: params.originId,
      attachmentType: params.attachmentType,
      action: params.action,
      spaces: [spaceId],
      esClient: elasticsearch.client.asInternalUser,
      savedObjectsClient: soClient,
      logger,
      force: params.force,
    });
  };

/**
 * Builds `AgentBuilderSmlPluginStart.deleteAttachment` — same
 * request-to-internal-params translation as {@link buildIndexAttachment},
 * for the dedicated delete path that lets callers choose which
 * `ingestionMethod` scope to wipe.
 */
export const buildDeleteAttachment =
  ({ smlService, elasticsearch, savedObjects, spaces, logger }: StartContractDeps) =>
  async (
    params: SmlDeleteAttachmentParams
  ): ReturnType<AgentBuilderSmlPluginStart['deleteAttachment']> => {
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
