/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

import type { KnowledgeBaseItem } from '../../../../common/types';
import { appContextService } from '../../app_context';
import { retryTransientEsErrors } from '../elasticsearch/retry';

import { KNOWLEDGE_BASE_PATH } from './install_state_machine/steps/step_save_knowledge_base';

export const INTEGRATION_KNOWLEDGE_INDEX = '.integration_knowledge';
export const DEFAULT_SIZE = 1000; // Set a reasonable default size for search results

export async function saveKnowledgeBaseContentToIndex({
  esClient,
  pkgName,
  pkgVersion,
  knowledgeBaseContent,
  abortController,
}: {
  esClient: ElasticsearchClient;
  pkgName: string;
  pkgVersion: string;
  knowledgeBaseContent: KnowledgeBaseItem[];
  abortController?: AbortController;
}): Promise<string[]> {
  // Always delete existing documents for this package (regardless of version)
  // This ensures we only have one set of docs per package
  await deletePackageKnowledgeBase(esClient, pkgName);

  if (!knowledgeBaseContent || knowledgeBaseContent.length === 0) {
    return [];
  }

  // Index each knowledge base file as a separate document
  const operations: estypes.BulkRequest['operations'] = [];
  const installedAt = new Date().toISOString();
  const documentIds: string[] = [];

  for (const item of knowledgeBaseContent) {
    // Generate document ID based on package name and filename for consistent behavior
    // This ensures the same document ID is used for retries and prevents duplicates
    const documentId = `${pkgName}-${item.fileName}`;
    documentIds.push(documentId);

    operations.push(
      { index: { _index: INTEGRATION_KNOWLEDGE_INDEX, _id: documentId } },
      {
        package_name: pkgName,
        filename: item.fileName,
        content: item.content,
        version: pkgVersion,
        installed_at: installedAt,
      }
    );
  }

  if (operations.length > 0) {
    const bulkResponse = await retryTransientEsErrors(
      async () =>
        esClient.bulk(
          {
            operations,
            refresh: 'wait_for',
          },
          abortController
            ? {
                signal: abortController.signal,
              }
            : undefined
        ),
      { logger: appContextService.getLogger() }
    ).catch((error) => {
      const logger = appContextService.getLogger();
      logger.error('Bulk index operation failed', error);
      throw error;
    });

    // Extract successfully indexed document IDs from the bulk response
    const successfullyIndexedIds: string[] = [];
    if (bulkResponse?.items) {
      for (const item of bulkResponse.items) {
        if (item.index && item.index._id && !item.index.error) {
          successfullyIndexedIds.push(item.index._id);
        } else {
          const logger = appContextService.getLogger();
          logger.error(`Bulk index operation failed: ${JSON.stringify(item)}`);
        }
      }
    }

    const logger = appContextService.getLogger();
    const failedCount = documentIds.length - successfullyIndexedIds.length;

    if (failedCount > 0) {
      logger.error(
        `${failedCount} out of ${documentIds.length} documents failed to index for package ${pkgName}`
      );
    }

    logger.debug(
      `Successfully indexed ${
        successfullyIndexedIds.length
      } knowledge base documents for package ${pkgName}. Document IDs: ${successfullyIndexedIds.join(
        ', '
      )}`
    );

    return successfullyIndexedIds;
  }

  return [];
}

export async function getPackageKnowledgeBaseFromIndex(
  esClient: ElasticsearchClient,
  pkgName: string,
  abortController?: AbortController
): Promise<KnowledgeBaseItem[]> {
  try {
    const query = {
      match: { package_name: pkgName },
    };

    const response = await esClient.search(
      {
        index: INTEGRATION_KNOWLEDGE_INDEX,
        query,
        size: DEFAULT_SIZE,
      },
      abortController
        ? {
            signal: abortController.signal,
          }
        : undefined
    );

    return response.hits.hits.map((hit: any) => ({
      fileName: hit._source.filename,
      content: hit._source.content,
      path: `${KNOWLEDGE_BASE_PATH}${hit._source.filename}`,
      installed_at: hit._source.installed_at,
      version: hit._source.version,
    }));
  } catch (error) {
    if (error.statusCode === 404) {
      return [];
    }
    throw error;
  }
}

export async function deletePackageKnowledgeBase(
  esClient: ElasticsearchClient,
  pkgName: string,
  abortController?: AbortController
) {
  const query = {
    match: { package_name: pkgName },
  };

  await esClient
    .deleteByQuery(
      {
        index: `${INTEGRATION_KNOWLEDGE_INDEX}*`,
        query,
      },
      abortController
        ? {
            signal: abortController.signal,
          }
        : undefined
    )
    .catch((error) => {
      const logger = appContextService.getLogger();
      logger.error('Delete operation failed', error);
    });
}
