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

/** One item to attach — same shape as the `sml_attach` tool and `POST .../sml/_attach`. */
export interface SmlAttachItemInput {
  chunk_id: string;
  attachment_id: string;
  attachment_type: string;
}

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
      attachment_type: string;
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
  items,
  sml,
  esClient,
  request,
  spaceId,
  savedObjectsClient,
  logger,
}: {
  items: SmlAttachItemInput[];
  sml: SmlService;
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}): Promise<SmlResolvedItemResult[]> => {
  const accessMap = await sml.checkItemsAccess({
    items: items.map((item) => ({ id: item.chunk_id, type: item.attachment_type })),
    spaceId,
    esClient,
    request,
  });

  const chunkIds = items.filter((item) => accessMap.get(item.chunk_id)).map((i) => i.chunk_id);
  const smlDocs = await sml.getDocuments({
    ids: chunkIds,
    spaceId,
    esClient,
  });

  return Promise.all(
    items.map(async (item) => {
      if (!accessMap.get(item.chunk_id)) {
        return {
          success: false,
          chunk_id: item.chunk_id,
          attachment_type: item.attachment_type,
          message: `Access denied: you do not have the required permissions to access SML item '${item.chunk_id}'`,
        };
      }

      const smlDoc = smlDocs.get(item.chunk_id);
      if (!smlDoc) {
        return {
          success: false,
          chunk_id: item.chunk_id,
          attachment_type: item.attachment_type,
          message: `SML document '${item.chunk_id}' not found in the index`,
        };
      }

      // Validate that client-supplied attachment_id and attachment_type match the fetched document.
      // Prevents TOCTOU mismatches and ensures the access check is consistent with the actual data.
      if (item.attachment_id !== smlDoc.origin_id || item.attachment_type !== smlDoc.type) {
        return {
          success: false,
          chunk_id: item.chunk_id,
          attachment_type: item.attachment_type,
          message: `Provided attachment_id/attachment_type do not match the SML document '${item.chunk_id}'`,
        };
      }

      const typeDefinition = sml.getTypeDefinition(smlDoc.type);
      if (!typeDefinition) {
        return {
          success: false,
          chunk_id: item.chunk_id,
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
            chunk_id: item.chunk_id,
            attachment_type: item.attachment_type,
            message: `Failed to convert SML item '${item.chunk_id}' to attachment — toAttachment returned undefined`,
          };
        }

        return {
          success: true,
          chunk_id: item.chunk_id,
          attachment: {
            type: convertedAttachment.type,
            data: convertedAttachment.data,
            origin: convertedAttachment.origin ?? smlDoc.origin_id,
          },
        };
      } catch (error) {
        logger.error(
          `sml_attach: error converting item '${item.chunk_id}' (type: ${item.attachment_type}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return {
          success: false,
          chunk_id: item.chunk_id,
          attachment_type: item.attachment_type,
          message: `Failed to convert SML item '${item.chunk_id}' to attachment`,
        };
      }
    })
  );
};
