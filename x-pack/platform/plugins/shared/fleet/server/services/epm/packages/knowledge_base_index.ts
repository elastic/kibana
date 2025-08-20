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

export const INTEGRATION_KNOWLEDGE_INDEX = '.integration_knowledge';
export const DEFAULT_SIZE = 1000; // Set a reasonable default size for search results

export async function saveKnowledgeBaseContentToIndex({
  esClient,
  pkgName,
  pkgVersion,
  knowledgeBaseContent,
}: {
  esClient: ElasticsearchClient;
  pkgName: string;
  pkgVersion: string;
  knowledgeBaseContent: KnowledgeBaseItem[];
}) {
  if (!knowledgeBaseContent || knowledgeBaseContent.length === 0) {
    return;
  }

  // Delete existing documents for this package version, but only if they exist
  await deletePackageKnowledgeBase(esClient, pkgName, pkgVersion);

  // Index each knowledge base file as a separate document
  const operations: estypes.BulkRequest['operations'] = [];
  const installedAt = new Date().toISOString();

  for (const item of knowledgeBaseContent) {
    const docId = `${pkgName}-${item.filename}`;

    operations.push(
      { index: { _index: INTEGRATION_KNOWLEDGE_INDEX, _id: docId } },
      {
        package_name: pkgName,
        filename: item.filename,
        content: item.content,
        version: pkgVersion,
        installed_at: installedAt,
      }
    );
  }

  if (operations.length > 0) {
    await retryTransientEsErrors(
      async () =>
        esClient.bulk({
          operations,
          refresh: 'wait_for',
        }),
      { logger: appContextService.getLogger() }
    ).catch((error) => {
      const logger = appContextService.getLogger();
      logger.error('Bulk index operation failed', error);
      throw error;
    });
  }
}

export async function getPackageKnowledgeBaseFromIndex(
  esClient: ElasticsearchClient,
  pkgName: string,
  pkgVersion?: string
): Promise<KnowledgeBaseItem[]> {
  try {
    let query: any;

    if (pkgVersion) {
      query = {
        bool: {
          must: [{ term: { package_name: pkgName } }, { term: { version: pkgVersion } }],
        },
      };
    } else {
      query = {
        term: { package_name: pkgName },
      };
    }

    const response = await esClient.search({
      index: INTEGRATION_KNOWLEDGE_INDEX,
      query,
      sort: [{ filename: 'asc' }],
      size: DEFAULT_SIZE,
    });

    return response.hits.hits.map((hit: any) => ({
      filename: hit._source.filename,
      content: hit._source.content,
      path: `docs/knowledge_base/${hit._source.filename}`,
      installed_at: hit._source.installed_at,
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
  pkgVersion?: string
) {
  let query: any;

  if (pkgVersion) {
    query = {
      bool: {
        must: [{ term: { package_name: pkgName } }, { term: { version: pkgVersion } }],
      },
    };
  } else {
    query = {
      term: { package_name: pkgName },
    };
  }

  await esClient
    .deleteByQuery({
      index: `${INTEGRATION_KNOWLEDGE_INDEX}*`,
      query,
    })
    .catch((error) => {
      const logger = appContextService.getLogger();
      logger.error('Delete operation failed', error);
    });
}

export async function updatePackageKnowledgeBaseVersion({
  esClient,
  pkgName,
  oldVersion,
  newVersion,
  knowledgeBaseContent,
}: {
  esClient: ElasticsearchClient;
  pkgName: string;
  oldVersion?: string;
  newVersion: string;
  knowledgeBaseContent: KnowledgeBaseItem[];
}) {
  if (!knowledgeBaseContent || knowledgeBaseContent.length === 0) {
    // If no new knowledge base content, just delete any existing content for this package
    await deletePackageKnowledgeBase(esClient, pkgName);
    return;
  }

  // Delete ALL existing documents for this package (regardless of version)
  // This handles both fresh installs and upgrades
  await deletePackageKnowledgeBase(esClient, pkgName);

  // Index the new knowledge base content with the new version
  const operations: estypes.BulkRequest['operations'] = [];
  const installedAt = new Date().toISOString();

  for (const item of knowledgeBaseContent) {
    const docId = `${pkgName}-${item.filename}`;

    operations.push(
      { index: { _index: INTEGRATION_KNOWLEDGE_INDEX, _id: docId } },
      {
        package_name: pkgName,
        filename: item.filename,
        content: item.content,
        version: newVersion,
        installed_at: installedAt,
      }
    );
  }

  if (operations.length > 0) {
    await retryTransientEsErrors(
      async () =>
        esClient.bulk({
          operations,
          refresh: 'wait_for',
        }),
      { logger: appContextService.getLogger() }
    );
  }
}
