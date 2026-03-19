/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { findingsMapping } from './findings_mapping';
import { scoresMapping } from './scores_mapping';
import {
  COMPLIANCE_FINDINGS_INDEX_PATTERN,
  COMPLIANCE_SCORES_INDEX_PATTERN,
  COMPLIANCE_ILM_POLICY_FINDINGS,
  COMPLIANCE_ILM_POLICY_SCORES,
  COMPLIANCE_FINDINGS_LATEST_INDEX,
  COMPLIANCE_FINDINGS_DATA_VIEW_ID,
  COMPLIANCE_SCORES_DATA_VIEW_ID,
} from '../../../common/compliance';

export const initializeComplianceIndices = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  dataViewsService?: DataViewsServerPluginStart
): Promise<void> => {
  try {
    await createIlmPolicies(esClient, logger);
    await createIndexTemplates(esClient, logger);
    await createFindingsTransform(esClient, logger);
    if (dataViewsService) {
      await createDataViews(dataViewsService, esClient, logger);
    }
  } catch (error) {
    logger.error(`Failed to initialize compliance indices: ${error.message}`);
  }
};

const createIlmPolicies = async (esClient: ElasticsearchClient, logger: Logger) => {
  try {
    await esClient.ilm.putLifecycle({
      name: COMPLIANCE_ILM_POLICY_FINDINGS,
      policy: {
        phases: {
          hot: {
            min_age: '0ms',
            actions: { rollover: { max_age: '7d', max_primary_shard_size: '50gb' } },
          },
          warm: { min_age: '7d', actions: { shrink: { number_of_shards: 1 } } },
          delete: { min_age: '30d', actions: { delete: {} } },
        },
      },
    });
    await esClient.ilm.putLifecycle({
      name: COMPLIANCE_ILM_POLICY_SCORES,
      policy: {
        phases: {
          hot: {
            min_age: '0ms',
            actions: { rollover: { max_age: '30d', max_primary_shard_size: '50gb' } },
          },
          delete: { min_age: '90d', actions: { delete: {} } },
        },
      },
    });
  } catch (error) {
    logger.warn(`Failed to create ILM policies: ${error.message}`);
  }
};

const createIndexTemplates = async (esClient: ElasticsearchClient, logger: Logger) => {
  try {
    await esClient.indices.putIndexTemplate({
      name: 'endpoint_compliance_findings',
      index_patterns: [COMPLIANCE_FINDINGS_INDEX_PATTERN],
      data_stream: {},
      template: {
        settings: { 'index.lifecycle.name': COMPLIANCE_ILM_POLICY_FINDINGS },
        mappings: findingsMapping,
      },
      priority: 500,
    });
    await esClient.indices.putIndexTemplate({
      name: 'endpoint_compliance_scores',
      index_patterns: [COMPLIANCE_SCORES_INDEX_PATTERN],
      data_stream: {},
      template: {
        settings: { 'index.lifecycle.name': COMPLIANCE_ILM_POLICY_SCORES },
        mappings: scoresMapping,
      },
      priority: 500,
    });
    logger.debug('Compliance index templates created');
  } catch (error) {
    logger.warn(`Failed to create index templates: ${error.message}`);
  }
};

const createFindingsTransform = async (esClient: ElasticsearchClient, logger: Logger) => {
  const transformId = 'endpoint_compliance-findings_latest';
  try {
    const exists = await esClient.transform
      .getTransform({ transform_id: transformId })
      .catch(() => null);
    if (exists) return;

    await esClient.transform.putTransform({
      transform_id: transformId,
      source: { index: [COMPLIANCE_FINDINGS_INDEX_PATTERN] },
      dest: { index: COMPLIANCE_FINDINGS_LATEST_INDEX },
      latest: {
        unique_key: ['rule.id', 'host.id'],
        sort: '@timestamp',
      },
      sync: { time: { field: '@timestamp', delay: '60s' } },
      frequency: '1m',
    });
    await esClient.transform.startTransform({ transform_id: transformId });
    logger.debug('Compliance findings transform created and started');
  } catch (error) {
    logger.warn(`Failed to create findings transform: ${error.message}`);
  }
};

const createDataViews = async (
  dataViewsService: DataViewsServerPluginStart,
  esClient: ElasticsearchClient,
  logger: Logger
) => {
  const dataViews = [
    {
      id: COMPLIANCE_FINDINGS_DATA_VIEW_ID,
      title: COMPLIANCE_FINDINGS_INDEX_PATTERN,
      name: 'Endpoint Compliance Findings',
      timeFieldName: '@timestamp',
    },
    {
      id: COMPLIANCE_SCORES_DATA_VIEW_ID,
      title: COMPLIANCE_SCORES_INDEX_PATTERN,
      name: 'Endpoint Compliance Scores',
      timeFieldName: '@timestamp',
    },
  ];

  for (const dv of dataViews) {
    try {
      const svc = await dataViewsService.dataViewsServiceFactory(
        undefined as any,
        esClient,
        undefined,
        true
      );
      const existing = await svc.find(dv.title).catch(() => []);
      if (existing.length === 0) {
        await svc.createAndSave({ ...dv });
        logger.debug(`Created data view: ${dv.name}`);
      }
    } catch (error) {
      logger.warn(`Failed to create data view ${dv.name}: ${error.message}`);
    }
  }
};
