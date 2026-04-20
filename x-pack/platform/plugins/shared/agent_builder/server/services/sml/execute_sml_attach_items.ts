/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { SmlService } from './types';

export type SmlResolvedItemResult =
  | {
      success: true;
      chunk_id: string;
      attachment: {
        type: string;
        data: unknown;
        origin: string;
      };
    }
  | {
      success: false;
      chunk_id: string;
      attachment_type?: string;
      message: string;
    };

/**
 * Resolves SML index hits into attachment data (access checks, fetch, toAttachment).
 * Does NOT persist — callers are responsible for adding the returned attachments
 * to the conversation via their own `AttachmentStateManager`.
 *
 * Used by the `sml_attach` built-in tool and the internal HTTP `_attach` route.
 */
export const resolveSmlAttachItems = async ({
  chunkIds,
  sml,
  esClient,
  request,
  spaceId,
  savedObjectsClient,
  logger,
}: {
  chunkIds: string[];
  sml: SmlService;
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}): Promise<SmlResolvedItemResult[]> => {
  const uniqueChunkIds = [...new Set(chunkIds)];
  const accessMap = await sml.checkItemsAccess({
    ids: uniqueChunkIds,
    spaceId,
    esClient,
    request,
  });

  const smlDocs = await sml.getDocuments({
    ids: uniqueChunkIds,
    spaceId,
    esClient,
  });

  return Promise.all(
    uniqueChunkIds.map(async (chunkId) => {
      if (!accessMap.get(chunkId)) {
        return {
          success: false,
          chunk_id: chunkId,
          message: `Access denied: you do not have the required permissions to access SML item '${chunkId}'`,
        };
      }

      const smlDoc = smlDocs.get(chunkId);
      if (!smlDoc) {
        return {
          success: false,
          chunk_id: chunkId,
          message: `SML document '${chunkId}' not found in the index`,
        };
      }

      const typeDefinition = sml.getTypeDefinition(smlDoc.type);
      if (!typeDefinition) {
        return {
          success: false,
          chunk_id: chunkId,
          attachment_type: smlDoc.type,
          message: `SML type '${smlDoc.type}' does not support conversion to attachment`,
        };
      }

      try {
        const convertedAttachment = await typeDefinition.toAttachment(smlDoc, {
          request,
          savedObjectsClient,
          spaceId,
        });

        if (!convertedAttachment) {
          return {
            success: false,
            chunk_id: chunkId,
            attachment_type: smlDoc.type,
            message: `Failed to convert SML item '${chunkId}' to attachment — toAttachment returned undefined`,
          };
        }

        return {
          success: true,
          chunk_id: chunkId,
          attachment: {
            type: convertedAttachment.type,
            data: convertedAttachment.data,
            origin: convertedAttachment.origin ?? smlDoc.origin_id,
          },
        };
      } catch (error) {
        logger.error(
          `sml_attach: error converting item '${chunkId}' (type: ${smlDoc.type}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return {
          success: false,
          chunk_id: chunkId,
          attachment_type: smlDoc.type,
          message: `Failed to convert SML item '${chunkId}' to attachment`,
        };
      }
    })
  );
};
