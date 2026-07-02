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
import type { CeService } from './types';

export type CeResolvedItemResult =
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
 * Resolves CE index hits into attachment data (access checks, fetch, toAttachment).
 * Does NOT persist — callers are responsible for adding the returned attachments
 * to the conversation via their own `AttachmentStateManager`.
 *
 * Used by the `ce_attach` built-in tool and the internal HTTP `_attach` route.
 */
export const resolveCeAttachItems = async ({
  entryIds,
  ce,
  esClient,
  request,
  spaceId,
  savedObjectsClient,
  logger,
}: {
  entryIds: string[];
  ce: CeService;
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}): Promise<CeResolvedItemResult[]> => {
  const uniqueEntryIds = [...new Set(entryIds)];
  const accessMap = await ce.checkItemsAccess({
    ids: uniqueEntryIds,
    spaceId,
    esClient,
    request,
  });

  const ceDocs = await ce.getDocuments({
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
          message: `Access denied: you do not have the required permissions to access CE item '${entryId}'`,
        };
      }

      const ceDoc = ceDocs.get(entryId);
      if (!ceDoc) {
        return {
          success: false,
          entry_id: entryId,
          message: `CE document '${entryId}' not found in the index`,
        };
      }

      const typeDefinition = ce.getTypeDefinition(ceDoc.type);
      if (!typeDefinition) {
        return {
          success: false,
          entry_id: entryId,
          attachment_type: ceDoc.type,
          message: `CE type '${ceDoc.type}' does not support conversion to attachment`,
        };
      }

      try {
        const convertedAttachment = await typeDefinition.toAttachment(ceDoc, {
          request,
          savedObjectsClient,
          spaceId,
        });

        if (!convertedAttachment) {
          return {
            success: false,
            entry_id: entryId,
            attachment_type: ceDoc.type,
            message: `Failed to convert CE item '${entryId}' to attachment — toAttachment returned undefined`,
          };
        }

        return {
          success: true,
          entry_id: entryId,
          attachment: {
            type: convertedAttachment.type,
            data: convertedAttachment.data,
            origin: convertedAttachment.origin ?? ceDoc.origin.uri,
            description: convertedAttachment.description ?? `${ceDoc.type}/${ceDoc.title}`,
          },
        };
      } catch (error) {
        logger.error(
          `ce_attach: error converting item '${entryId}' (type: ${ceDoc.type}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return {
          success: false,
          entry_id: entryId,
          attachment_type: ceDoc.type,
          message: `Failed to convert CE item '${entryId}' to attachment`,
        };
      }
    })
  );
};
