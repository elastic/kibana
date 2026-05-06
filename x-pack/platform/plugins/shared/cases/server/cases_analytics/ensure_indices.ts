/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

import { CASES_DATA_ILM_POLICY_ID, CASES_DATA_INDEX_TEMPLATE_PREFIX } from '../../common/constants';
import {
  CASES_DATA_AUTO_EXPAND_REPLICAS,
  CASES_DATA_NUMBER_OF_SHARDS,
  CASES_DATA_REFRESH_INTERVAL,
  CASES_DATA_SURFACES,
  getIndexTemplateName,
  getInitialBackingIndex,
  getRolloverAlias,
  type CasesDataSurface,
} from './constants';
import { CASE_INDEX_MAPPING } from './mappings/case';
import { CASE_ACTIVITY_INDEX_MAPPING } from './mappings/case_activity';
import { CASE_LIFECYCLE_INDEX_MAPPING } from './mappings/case_lifecycle';

const MAPPING_BY_SURFACE: Record<CasesDataSurface, MappingTypeMapping> = {
  case: CASE_INDEX_MAPPING,
  case_activity: CASE_ACTIVITY_INDEX_MAPPING,
  case_lifecycle: CASE_LIFECYCLE_INDEX_MAPPING,
};

/**
 * Ensure the index template + initial backing index exist for every surface. Race-safe
 * on concurrent Kibana node startup: `resource_already_exists_exception` and
 * `version_conflict_engine_exception` are swallowed at debug.
 */
export const ensureCasesDataIndices = async ({
  esClient,
  logger,
  isServerless,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  /**
   * On serverless, ILM is managed by the platform — we don't attach a policy ourselves.
   * On stateful, we wire up the rollover policy.
   */
  isServerless: boolean;
}): Promise<void> => {
  for (const surface of CASES_DATA_SURFACES) {
    await ensureSurface({ esClient, logger, surface, isServerless });
  }
};

const ensureSurface = async ({
  esClient,
  logger,
  surface,
  isServerless,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  surface: CasesDataSurface;
  isServerless: boolean;
}): Promise<void> => {
  const templateName = getIndexTemplateName(surface);
  const alias = getRolloverAlias(surface);
  const initialIndex = getInitialBackingIndex(surface);

  await putIndexTemplate({
    esClient,
    logger,
    surface,
    templateName,
    alias,
    isServerless,
  });

  // Bootstrap the initial backing index if no index already covers the alias.
  await bootstrapInitialIndex({
    esClient,
    logger,
    alias,
    initialIndex,
    surface,
    templateName,
  });
};

const putIndexTemplate = async ({
  esClient,
  logger,
  surface,
  templateName,
  alias,
  isServerless,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  surface: CasesDataSurface;
  templateName: string;
  alias: string;
  isServerless: boolean;
}): Promise<void> => {
  // The composed template covers the rollover pattern (alias-NNNNNN). The alias is
  // attached at template level so every rolled-over index inherits it.
  try {
    await esClient.indices.putIndexTemplate({
      name: templateName,
      // priority must be high enough to win over generic stack templates; alerts uses
      // similar values. 200 is comfortably above stack defaults.
      priority: 200,
      index_patterns: [`${alias}-*`, `.internal.${CASES_DATA_INDEX_TEMPLATE_PREFIX}.${surface}-*`],
      template: {
        settings: {
          'index.number_of_shards': CASES_DATA_NUMBER_OF_SHARDS,
          'index.auto_expand_replicas': CASES_DATA_AUTO_EXPAND_REPLICAS,
          'index.refresh_interval': CASES_DATA_REFRESH_INTERVAL,
          'index.hidden': true,
          ...(!isServerless && {
            'index.lifecycle.name': CASES_DATA_ILM_POLICY_ID,
            'index.lifecycle.rollover_alias': alias,
          }),
        },
        mappings: MAPPING_BY_SURFACE[surface],
      },
      _meta: {
        managed: true,
        managed_by: 'kibana-cases-plugin',
      },
    });
    logger.debug(`cases.analytics index template ${templateName} ensured`);
  } catch (err) {
    logger.warn(`cases.analytics: failed to put index template ${templateName}: ${err.message}`);
  }
};

const bootstrapInitialIndex = async ({
  esClient,
  logger,
  alias,
  initialIndex,
  surface,
  templateName,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  alias: string;
  initialIndex: string;
  surface: CasesDataSurface;
  templateName: string;
}): Promise<void> => {
  // If anything is already pointed at the alias, skip — either we created it on a
  // previous start or rollover has already advanced the write index.
  try {
    const aliasExists = await esClient.indices.existsAlias({ name: alias });
    if (aliasExists) {
      logger.debug(`cases.analytics alias ${alias} already exists; skipping bootstrap`);
      return;
    }

    await esClient.indices.create({
      index: initialIndex,
      aliases: {
        [alias]: { is_write_index: true },
      },
    });
    logger.debug(`cases.analytics bootstrapped ${initialIndex} (template=${templateName})`);
  } catch (err) {
    // Concurrent node bootstrap collisions are expected and swallowed.
    if (
      err?.body?.error?.type === 'resource_already_exists_exception' ||
      err?.meta?.body?.error?.type === 'resource_already_exists_exception'
    ) {
      logger.debug(`cases.analytics: ${initialIndex} already exists (concurrent bootstrap)`);
      return;
    }
    logger.warn(
      `cases.analytics: failed to bootstrap initial index for surface ${surface}: ${err.message}`
    );
  }
};
