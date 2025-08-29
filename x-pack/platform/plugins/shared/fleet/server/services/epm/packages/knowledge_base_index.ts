/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';

import type { KnowledgeBaseItem } from '../../../../common/types';
import { appContextService } from '../../app_context';
import { retryTransientEsErrors } from '../elasticsearch/retry';

import { KNOWLEDGE_BASE_PATH } from './install_state_machine/steps/step_save_knowledge_base';

export const INTEGRATION_KNOWLEDGE_INDEX = '.integration_knowledge';
export const DEFAULT_SIZE = 1000; // Set a reasonable default size for search results

/**
 * Sample content for the Fleet system initialization document.
 * This content is used to initialize the knowledge base index during Fleet setup.
 * Update this content as needed to provide better context for knowledge base operations.
 */
const FLEET_SYSTEM_INITIALIZATION_CONTENT = `# What is Elastic Fleet?

Elastic Fleet is a centralized management solution for Elastic Agents, enabling streamlined deployment, configuration, and monitoring of agents across your infrastructure. Fleet simplifies the process of collecting logs, metrics, and security data from diverse sources, making it easier to manage at scale.

---

## Key Features

- **Centralized Agent Management:** Deploy, upgrade, and configure Elastic Agents from a single UI.
- **Policy-Based Configuration:** Apply policies to groups of agents for consistent data collection and security posture.
- **Integration Marketplace:** Easily add integrations for popular data sources (cloud, endpoint, network, etc.) without manual configuration.
- **Monitoring & Health:** View agent status, troubleshoot issues, and ensure data is flowing as expected.
- **Security:** Fleet supports secure enrollment and communication between agents and the Elastic Stack.

---

## Common Use Cases

- Collecting logs and metrics from servers, containers, and cloud services.
- Enabling endpoint security and threat detection.
- Centralizing observability and security data for analysis in Kibana.

---

## Common Issues and Troubleshooting

### 1. Agent Not Enrolling or Showing as Offline
- **Check network connectivity** between the agent and Fleet Server.
- **Verify enrollment token** and Fleet Server URL are correct.
- **Review agent logs** for errors related to enrollment or communication.

### 2. Data Not Appearing in Kibana
- **Confirm agent is running** and healthy in the Fleet UI.
- **Check integration configuration** for correct data source settings.
- **Look for errors** in agent and Fleet Server logs.

### 3. Policy Changes Not Applied
- **Ensure agent is online** and connected to Fleet.
- **Check for pending actions** in the Fleet UI.
- **Restart the agent** if it appears stuck.

### 4. Integration Fails to Install
- **Verify permissions** for the user installing the integration.
- **Check for version compatibility** between the integration, agent, and Elastic Stack.
- **Review logs** for installation errors.

### 5. Security or Certificate Issues
- **Ensure certificates are valid** and trusted by both agent and Fleet Server.
- **Check for mismatched enrollment tokens** or expired tokens.

---

## Best Practices

- Regularly review agent and integration health in the Fleet UI.
- Use policies to standardize data collection across environments.
- Keep agents and integrations up to date for the latest features and security patches.
- Monitor logs for early signs of connectivity or configuration issues.

---

## Resources

- [Fleet and Elastic Agent documentation](https://www.elastic.co/guide/en/fleet/current/index.html)
- [Fleet overview in Elastic Docs](https://www.elastic.co/docs/solutions/fleet/overview)
- [Troubleshooting guide for Fleet and Elastic Agent](https://www.elastic.co/guide/en/fleet/current/fleet-troubleshooting.html)`;

/**
 * Configuration for the Fleet system initialization document
 */
const FLEET_SYSTEM_DOC_CONFIG = {
  packageName: '__fleet_system_dummy__',
  filename: 'fleet_system_overview.md',
  version: '1.0.0',
  documentId: '__fleet_system_dummy_doc__',
} as const;

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
    // Generate document ID upfront for consistent retries. This stops
    // the creation of new IDs for retried documents, ensuring the same
    // ID is used and avoids an issue where retries could timeout but still cause
    // docs to get indexed resulting in duplicated documents.
    const documentId = uuidv4();
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
  pkgName: string
): Promise<KnowledgeBaseItem[]> {
  try {
    const query = {
      match: { package_name: pkgName },
    };

    const response = await esClient.search({
      index: INTEGRATION_KNOWLEDGE_INDEX,
      query,
      size: DEFAULT_SIZE,
    });

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

export async function deletePackageKnowledgeBase(esClient: ElasticsearchClient, pkgName: string) {
  const query = {
    match: { package_name: pkgName },
  };

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

/**
 * Initialize the knowledge base index with a dummy document with generic information about fleet during Fleet setup.
 * This ensures the index exists and prevents issues with inference model deployment
 * when the index is empty.
 */
export async function initializeKnowledgeBaseIndex(esClient: ElasticsearchClient): Promise<void> {
  const logger = appContextService.getLogger();

  try {
    // Check if the index already exists
    const indexExists = await esClient.indices.exists({
      index: INTEGRATION_KNOWLEDGE_INDEX,
    });

    if (indexExists) {
      // Check if there are any documents in the index
      const countResponse = await esClient.count({
        index: INTEGRATION_KNOWLEDGE_INDEX,
      });

      if (countResponse.count > 0) {
        logger.debug(
          `Knowledge base index ${INTEGRATION_KNOWLEDGE_INDEX} already contains documents`
        );
        return;
      }
    }

    // Create a dummy document to initialize the index
    const dummyDocument = {
      package_name: FLEET_SYSTEM_DOC_CONFIG.packageName,
      filename: FLEET_SYSTEM_DOC_CONFIG.filename,
      content: FLEET_SYSTEM_INITIALIZATION_CONTENT,
      version: FLEET_SYSTEM_DOC_CONFIG.version,
      installed_at: new Date().toISOString(),
    };

    await retryTransientEsErrors(
      async () =>
        esClient.index({
          index: INTEGRATION_KNOWLEDGE_INDEX,
          id: FLEET_SYSTEM_DOC_CONFIG.documentId,
          document: dummyDocument,
          refresh: 'wait_for',
        }),
      { logger }
    );

    logger.debug(
      `Initialized knowledge base index ${INTEGRATION_KNOWLEDGE_INDEX} with dummy document`
    );
  } catch (error) {
    logger.warn(`Failed to initialize knowledge base index: ${error.message}`);
    // Don't throw error to avoid breaking Fleet setup
  }
}
