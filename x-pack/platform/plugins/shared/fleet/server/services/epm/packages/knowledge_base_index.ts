/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { KnowledgeBaseItem } from '../../../../common/types';

export const INTEGRATION_KNOWLEDGE_INDEX = '.integration_knowledge';

export const INTEGRATION_KNOWLEDGE_INDEX_TEMPLATE = {
  index_patterns: [`${INTEGRATION_KNOWLEDGE_INDEX}*`], // Add wildcard support to template here so that we can reuse the const everywhere else
  template: {
    settings: {
      'index.hidden': true,
    },
    mappings: {
      properties: {
        filename: { type: 'keyword' as const },
        content: { type: 'semantic_text' as const },
        version: { type: 'version' as const },
        package_name: { type: 'keyword' as const },
        installed_at: { type: 'date' as const },
      },
    },
  },
  _meta: {
    description: 'Integration package knowledge base content storage',
    managed: true,
  },
};

export async function ensureIntegrationKnowledgeIndex(esClient: ElasticsearchClient) {
  try {
    // Check if index template exists
    const templateExists = await esClient.indices.existsIndexTemplate({
      name: 'integration-knowledge-template',
    });

    if (!templateExists) {
      // Create index template
      await esClient.indices.putIndexTemplate({
        name: 'integration-knowledge-template',
        ...INTEGRATION_KNOWLEDGE_INDEX_TEMPLATE,
      });
    }

    // Check if index exists
    const indexExists = await esClient.indices.exists({
      index: INTEGRATION_KNOWLEDGE_INDEX,
    });

    if (!indexExists) {
      // Create the index
      await esClient.indices.create({
        index: INTEGRATION_KNOWLEDGE_INDEX,
        settings: INTEGRATION_KNOWLEDGE_INDEX_TEMPLATE.template.settings,
        mappings: INTEGRATION_KNOWLEDGE_INDEX_TEMPLATE.template.mappings,
      });
    }
  } catch (error) {
    throw new Error(`Failed to ensure integration knowledge index: ${error.message}`);
  }
}

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

  // Ensure the system index exists
  await ensureIntegrationKnowledgeIndex(esClient);

  // Delete existing documents for this package version
  await esClient.deleteByQuery({
    index: INTEGRATION_KNOWLEDGE_INDEX,
    query: {
      bool: {
        must: [{ term: { 'package_name.keyword': pkgName } }, { term: { version: pkgVersion } }],
      },
    },
    refresh: true,
  });

  // Index each knowledge base file as a separate document
  const operations = [];
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
    await esClient.bulk({
      operations,
      refresh: 'wait_for',
    });
  }
}

export async function getPackageKnowledgeBaseFromIndex(
  esClient: ElasticsearchClient,
  pkgName: string,
  pkgVersion?: string
): Promise<KnowledgeBaseItem[]> {
  try {
    const query: any = {
      term: { 'package_name.keyword': pkgName },
    };

    if (pkgVersion) {
      query.bool = {
        must: [{ term: { 'package_name.keyword': pkgName } }, { term: { version: pkgVersion } }],
      };
    }

    const response = await esClient.search({
      index: INTEGRATION_KNOWLEDGE_INDEX,
      query: pkgVersion ? query.bool : query,
      sort: [{ filename: 'asc' }],
      size: 1000,
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
  const query: any = {
    term: { 'package_name.keyword': pkgName },
  };

  if (pkgVersion) {
    query.bool = {
      must: [{ term: { 'package_name.keyword': pkgName } }, { term: { version: pkgVersion } }],
    };
  }

  await esClient.deleteByQuery({
    index: INTEGRATION_KNOWLEDGE_INDEX,
    query: pkgVersion ? query.bool : query,
    refresh: true,
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

  // Ensure the system index exists
  await ensureIntegrationKnowledgeIndex(esClient);

  // Delete ALL existing documents for this package (regardless of version)
  // This handles both fresh installs and upgrades
  await deletePackageKnowledgeBase(esClient, pkgName);

  // Index the new knowledge base content with the new version
  const operations = [];
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
    await esClient.bulk({
      operations,
      refresh: 'wait_for',
    });
  }
}
