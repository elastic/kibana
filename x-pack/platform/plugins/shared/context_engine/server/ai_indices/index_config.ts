/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { AiIndexDest, AiIndexDls, AiIndexIndexConfig } from '../../common/http_api/ai_indices';

/**
 * The base template every AI index inherits. Consumer `index_config` is deep-merged
 * on top of this. Intentionally minimal for now — this is the seam where the shared
 * KI index template (search-team #15351) plugs in once it lands.
 */
export const AI_INDEX_BASE_TEMPLATE: AiIndexIndexConfig = {
  mappings: {
    dynamic: 'strict',
  },
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Deep-merges `override` into `base`, recursing into plain objects and letting the
 * override win on scalar/array conflicts. This is how consumer index config is
 * composed with the base template.
 */
export const deepMerge = (
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...base };
  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = result[key];
    result[key] =
      isPlainObject(baseValue) && isPlainObject(overrideValue)
        ? deepMerge(baseValue, overrideValue)
        : overrideValue;
  }
  return result;
};

export const mergeWithBaseTemplate = (config?: AiIndexIndexConfig): AiIndexIndexConfig =>
  config
    ? (deepMerge(
        AI_INDEX_BASE_TEMPLATE as Record<string, unknown>,
        config as Record<string, unknown>
      ) as AiIndexIndexConfig)
    : AI_INDEX_BASE_TEMPLATE;

/**
 * Applies a consumer's index config by creating/updating a composable index template
 * (base template merged with the config) for the dest pattern, so the dest index
 * inherits settings/mappings — including runtime fields — whenever it is (re)created.
 * If the dest already exists, the mappings are also pushed so they take effect now.
 * Idempotent; safe to call on every startup.
 */
export const applyIndexConfig = async ({
  esClient,
  id,
  dest,
  indexConfig,
  logger,
}: {
  esClient: ElasticsearchClient;
  id: string;
  dest: AiIndexDest;
  indexConfig: AiIndexIndexConfig | undefined;
  logger: Logger;
}): Promise<void> => {
  const merged = mergeWithBaseTemplate(indexConfig);
  try {
    await esClient.indices.putIndexTemplate({
      name: `ai-index-${id}`,
      index_patterns: [dest.value],
      // Above the default template priority so this ai-index's config wins for its dest.
      priority: 500,
      template: {
        settings: merged.settings as estypes.IndicesIndexSettings | undefined,
        mappings: merged.mappings as estypes.MappingTypeMapping | undefined,
      },
    });

    const exists = await esClient.indices.exists({ index: dest.value });
    if (exists && merged.mappings) {
      await esClient.indices.putMapping({
        index: dest.value,
        ...(merged.mappings as estypes.MappingTypeMapping),
      });
    }
    logger.debug(`Applied index config for AI index '${id}' (dest '${dest.value}')`);
  } catch (err) {
    logger.warn(
      `Failed to apply index config for AI index '${id}': ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};

/**
 * Creates/updates the Elasticsearch role that carries the DLS query on the dest index,
 * so consumers reading the ai-index as themselves are scoped by the query. Idempotent.
 */
export const applyDls = async ({
  esClient,
  id,
  dest,
  dls,
  logger,
}: {
  esClient: ElasticsearchClient;
  id: string;
  dest: AiIndexDest;
  dls: AiIndexDls;
  logger: Logger;
}): Promise<void> => {
  try {
    await esClient.security.putRole({
      name: dls.role,
      indices: [
        {
          names: [dest.value],
          privileges: ['read'],
          query: dls.query,
        },
      ],
    });
    logger.debug(`Applied DLS role '${dls.role}' for AI index '${id}'`);
  } catch (err) {
    logger.warn(
      `Failed to apply DLS role '${dls.role}' for AI index '${id}': ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};
