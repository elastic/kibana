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
import type { SmlDocument, AgentBuilderSmlResolvedItemResult } from '@kbn/agent-builder-server';
import type { SmlTypeRegistry } from './type_registry';

export type SmlResolvedItemResult = AgentBuilderSmlResolvedItemResult;

/**
 * Resolves SML index hits into attachment data (access checks, fetch, toAttachment).
 * Does NOT persist — callers are responsible for adding the returned attachments
 * to the conversation via their own `AttachmentStateManager`.
 *
 * Used by the `sml_attach` built-in tool and the internal HTTP `_attach` route.
 */
export const resolveSmlAttachItems = async ({
  chunkIds,
  checkItemsAccess,
  getDocuments,
  getTypeDefinition,
  esClient,
  request,
  spaceId,
  savedObjectsClient,
  logger,
}: {
  chunkIds: string[];
  checkItemsAccess: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
  }) => Promise<Map<string, boolean>>;
  getDocuments: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
  }) => Promise<Map<string, SmlDocument>>;
  getTypeDefinition: SmlTypeRegistry['get'];
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}): Promise<SmlResolvedItemResult[]> => {
  const uniqueChunkIds = [...new Set(chunkIds)];
  const accessMap = await checkItemsAccess({
    ids: uniqueChunkIds,
    spaceId,
    esClient,
    request,
  });

  const smlDocs = await getDocuments({
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

      const typeDefinition = getTypeDefinition(smlDoc.type);
      if (!typeDefinition) {
        // Unregistered type (e.g. workflow ad-hoc namespace): fall back to plain text attachment.
        return {
          success: true,
          chunk_id: chunkId,
          attachment: {
            type: 'text',
            data: { title: smlDoc.title, content: smlDoc.content },
            origin: smlDoc.origin.uri,
            description: `${smlDoc.type}/${smlDoc.title}`,
          },
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
            origin: convertedAttachment.origin ?? smlDoc.origin.uri,
            description: convertedAttachment.description ?? `${smlDoc.type}/${smlDoc.title}`,
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
