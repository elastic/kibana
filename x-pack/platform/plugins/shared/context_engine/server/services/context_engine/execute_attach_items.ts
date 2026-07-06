/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { ContextEngineService } from './types';

export type ContextEngineResolvedItemResult =
  | {
      success: true;
      entry_id: string;
      attachment: {
        type: string;
        data: unknown;
        origin: string;
        description: string;
      };
    }
  | {
      success: false;
      entry_id: string;
      attachment_type?: string;
      message: string;
    };

/**
 * Resolves Context Engine index hits into attachment data (access checks, fetch, toAttachment).
 * Does NOT persist — callers are responsible for adding the returned attachments
 * to the conversation via their own `AttachmentStateManager`.
 *
 * Used by the `sml_attach` built-in tool and the internal HTTP `_attach` route.
 */
export const resolveAttachItems = async ({
  entryIds,
  contextEngine,
  esClient,
  request,
  spaceId,
  savedObjectsClient,
  logger,
}: {
  entryIds: string[];
  contextEngine: ContextEngineService;
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}): Promise<ContextEngineResolvedItemResult[]> => {
  const uniqueEntryIds = [...new Set(entryIds)];
  const accessMap = await contextEngine.checkItemsAccess({
    ids: uniqueEntryIds,
    spaceId,
    esClient,
    request,
  });

  const contextEngineDocs = await contextEngine.getDocuments({
    ids: uniqueEntryIds,
    spaceId,
    esClient,
  });

  return Promise.all(
    uniqueEntryIds.map(async (entryId) => {
      if (!accessMap.get(entryId)) {
        return {
          success: false,
          entry_id: entryId,
          message: `Access denied: you do not have the required permissions to access Context Engine item '${entryId}'`,
        };
      }

      const contextEngineDoc = contextEngineDocs.get(entryId);
      if (!contextEngineDoc) {
        return {
          success: false,
          entry_id: entryId,
          message: `Context Engine document '${entryId}' not found in the index`,
        };
      }

      const typeDefinition = contextEngine.getTypeDefinition(contextEngineDoc.type);
      if (!typeDefinition) {
        // Unregistered type (e.g. workflow ad-hoc namespace): fall back to plain text attachment.
        return {
          success: true,
          entry_id: entryId,
          attachment: {
            type: 'text',
            data: { title: contextEngineDoc.title, content: contextEngineDoc.content },
            origin: contextEngineDoc.origin.uri,
            description: `${contextEngineDoc.type}/${contextEngineDoc.title}`,
          },
        };
      }

      try {
        const convertedAttachment = await typeDefinition.toAttachment(contextEngineDoc, {
          request,
          savedObjectsClient,
          spaceId,
        });

        if (!convertedAttachment) {
          return {
            success: false,
            entry_id: entryId,
            attachment_type: contextEngineDoc.type,
            message: `Failed to convert Context Engine item '${entryId}' to attachment — toAttachment returned undefined`,
          };
        }

        return {
          success: true,
          entry_id: entryId,
          attachment: {
            type: convertedAttachment.type,
            data: convertedAttachment.data,
            origin: convertedAttachment.origin ?? contextEngineDoc.origin.uri,
            description:
              convertedAttachment.description ??
              `${contextEngineDoc.type}/${contextEngineDoc.title}`,
          },
        };
      } catch (error) {
        logger.error(
          `sml_attach: error converting item '${entryId}' (type: ${contextEngineDoc.type}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return {
          success: false,
          entry_id: entryId,
          attachment_type: contextEngineDoc.type,
          message: `Failed to convert Context Engine item '${entryId}' to attachment`,
        };
      }
    })
  );
};
