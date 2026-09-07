/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, FeatureFlagsStart, Logger } from '@kbn/core/server';
import { ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { ENTITY_CREATED_BY_FIELD } from '../../../common/domain/definitions/common_fields';
import {
  putComponentTemplate,
  putDataStreamMapping,
  putIndexTemplate,
} from '../../infra/elasticsearch';
import { getEntityDefinitionComponentTemplate } from './component_templates';
import { getLatestEntityIndexTemplateConfig } from './latest_index_template';
import { resolveLatestEntitiesIndexName } from './resolve_entity_store_indices';
import { isEntityProvenanceEnabled } from '../../infra/feature_flags';

interface EsErrorLike {
  statusCode?: number;
  meta?: {
    statusCode?: number;
    body?: { error?: { type?: string } };
  };
}

const isIndexNotFound = (error: unknown): boolean => {
  const esError = error as EsErrorLike;
  return (
    esError?.meta?.body?.error?.type === 'index_not_found_exception' ||
    esError?.meta?.statusCode === 404 ||
    esError?.statusCode === 404
  );
};

/** Installs current latest-index templates and adds the provenance mapping in place, returning false only when the latest index is missing. */
export const ensureLatestIndexProvenanceMapping = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<boolean> => {
  const definitions = ALL_ENTITY_TYPES.map((type) => getEntityDefinition(type, namespace));
  await Promise.all(
    definitions.map((definition) =>
      putComponentTemplate(esClient, getEntityDefinitionComponentTemplate(definition, namespace))
    )
  );
  await putIndexTemplate(esClient, getLatestEntityIndexTemplateConfig(namespace));

  const latestIndex = await resolveLatestEntitiesIndexName(esClient, namespace);
  try {
    await putDataStreamMapping(esClient, latestIndex, {
      properties: {
        [ENTITY_CREATED_BY_FIELD]: { type: 'keyword' },
      },
    });
    logger.debug(`Synced entity provenance mapping for namespace ${namespace}`);
    return true;
  } catch (error) {
    if (isIndexNotFound(error)) {
      logger.debug(
        `Latest Entity Store index does not exist in namespace ${namespace}; provenance mapping will be applied by its index template`
      );
      return false;
    }
    throw error;
  }
};

const ensuredNamespaces = new Set<string>();

/** Ensures the provenance mapping once per namespace and process while leaving failures uncached for later retries. */
export const ensureLatestIndexProvenanceMappingOnce = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<boolean> => {
  if (ensuredNamespaces.has(namespace)) {
    return true;
  }

  try {
    const mappingExists = await ensureLatestIndexProvenanceMapping(esClient, namespace, logger);
    if (mappingExists) {
      ensuredNamespaces.add(namespace);
    }
    return mappingExists;
  } catch (error) {
    logger.warn(
      `Failed to sync Entity Store provenance mapping for namespace ${namespace}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
};

/** Enables extraction provenance only after its gated mapping update succeeds. */
export const prepareLatestIndexProvenanceMapping = async ({
  esClient,
  featureFlags,
  namespace,
  logger,
}: {
  esClient: ElasticsearchClient;
  featureFlags: FeatureFlagsStart;
  namespace: string;
  logger: Logger;
}): Promise<boolean> => {
  if (!(await isEntityProvenanceEnabled(featureFlags))) {
    return false;
  }
  return ensureLatestIndexProvenanceMappingOnce(esClient, namespace, logger);
};

export const resetEnsuredLatestIndexProvenanceNamespaces = (): void => {
  ensuredNamespaces.clear();
};
