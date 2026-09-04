/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AttachmentsService } from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { PromptImageResolver } from '../prompts/types';

export interface CreateImageResolverOptions {
  attachmentStateManager: AttachmentStateManager;
  attachments: AttachmentsService;
  request: KibanaRequest;
  spaceId: string;
  logger: Logger;
}

/**
 * Creates an image resolver — fetches base64 from the files plugin for a given attachment.
 * Results are memoized so the file is only downloaded once per LLM call even if the
 * image appears multiple times in the action history. No actor is recorded; this is
 * prompt-building, not an agent-initiated access.
 */
export const createImageResolver = ({
  attachmentStateManager,
  attachments,
  request,
  spaceId,
  logger,
}: CreateImageResolverOptions): PromptImageResolver => {
  const cache = new LRUCache<string, { value: { base64: string; mimeType: string } | null }>({
    max: 32,
  });

  return async ({ attachmentId, version }) => {
    const cacheKey = `${attachmentId}:${version ?? 'current'}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)?.value ?? undefined;
    }
    try {
      const snapshot = attachmentStateManager.get(attachmentId, { version });
      if (!snapshot) {
        cache.set(cacheKey, { value: null });
        return undefined;
      }
      const definition = attachments.getTypeDefinition(snapshot.type);
      if (!definition) {
        cache.set(cacheKey, { value: null });
        return undefined;
      }
      const formatted = await definition.format(
        { id: snapshot.id, type: snapshot.type, data: snapshot.data.data },
        { request, spaceId }
      );
      if (!formatted.getRepresentation) {
        cache.set(cacheKey, { value: null });
        return undefined;
      }
      // Using the deprecated getRepresentation API - no alternative exists yet;
      const representation = await formatted.getRepresentation();
      if (representation.type !== 'image') {
        cache.set(cacheKey, { value: null });
        return undefined;
      }
      const base64 = await representation.getBase64();
      const result = { base64, mimeType: representation.mimeType };
      cache.set(cacheKey, { value: result });
      return result;
    } catch (e) {
      logger.debug(`imageResolver failed for attachment "${attachmentId}": ${e}`);
      cache.set(cacheKey, { value: null });
      return undefined;
    }
  };
};
