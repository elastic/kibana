/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { toElasticsearchQuery } from '@kbn/es-query';

import { AGENTS_INDEX, AGENT_TYPE_OPAMP } from '../../../common/constants';
import type { CollectorGroup } from '../../../common/types';

import { PIPELINE_CONFIG_RUNTIME_FIELD } from './build_pipeline_config_runtime_field';
import { SIGNALS_RUNTIME_FIELD } from './build_signals_runtime_field';
import {
  ACTIVE_AGENT_CONDITION,
  ENROLLED_AGENT_CONDITION,
  _joinFilters,
  getSpaceAwarenessFilterForAgents,
  includeUnenrolled,
} from './crud';
import { buildAgentStatusRuntimeField } from './build_status_runtime_field';

const GROUP_BY_FIELDS: Record<string, { valueField: string; nameField: string }> = {
  'collector.group': {
    valueField: 'non_identifying_attributes.elastic.collector.group',
    nameField: 'non_identifying_attributes.elastic.collector.group_name',
  },
  'config.name': {
    valueField: 'non_identifying_attributes.config.name',
    nameField: 'non_identifying_attributes.config.description',
  },
  pipeline_config: {
    valueField: 'pipeline_config',
    nameField: 'pipeline_config',
  },
};

export type CollectorGroupByField = keyof typeof GROUP_BY_FIELDS;

interface GetCollectorGroupsOptions {
  groupBy: CollectorGroupByField;
  kuery?: string;
  perPage: number;
  afterKey?: Record<string, string>;
  spaceId?: string;
  showInactive?: boolean;
}

export async function getCollectorGroups(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  options: GetCollectorGroupsOptions
): Promise<{ items: CollectorGroup[]; afterKey?: string }> {
  const { groupBy, kuery, perPage, afterKey, spaceId, showInactive = false } = options;
  const { valueField, nameField } = GROUP_BY_FIELDS[groupBy];

  const filters = await getSpaceAwarenessFilterForAgents(spaceId);
  filters.push(`type:${AGENT_TYPE_OPAMP}`);
  if (showInactive === false) {
    filters.push(ACTIVE_AGENT_CONDITION);
  }
  if (!includeUnenrolled(kuery)) {
    filters.push(ENROLLED_AGENT_CONDITION);
  }

  if (kuery) {
    filters.push(kuery);
  }

  const kueryNode = _joinFilters(filters);

  const runtimeFields = {
    ...(await buildAgentStatusRuntimeField(soClient)),
    ...SIGNALS_RUNTIME_FIELD,
    ...PIPELINE_CONFIG_RUNTIME_FIELD,
  };

  const res = await esClient.search<
    {},
    {
      groups: {
        buckets: Array<{
          key: { group: string | null };
          doc_count: number;
          group_name: { buckets: Array<{ key: string }> };
          signals: { buckets: Array<{ key: string }> };
          pipeline_configs: { buckets: Array<{ key: string }> };
          pipeline_configs_count: { value: number };
          first_seen: { value: number | null; value_as_string?: string };
          last_seen: { value: number | null; value_as_string?: string };
        }>;
        after_key?: { group: string | null };
      };
    }
  >({
    index: AGENTS_INDEX,
    size: 0,
    runtime_mappings: runtimeFields,
    query: kueryNode ? toElasticsearchQuery(kueryNode) : undefined,
    aggs: {
      groups: {
        composite: {
          size: perPage + 1, // ask for one more than needed to determine if there is a next page
          ...(afterKey ? { after: afterKey } : {}),
          sources: [
            {
              group: {
                terms: { field: valueField, missing_bucket: true, missing_order: 'last' },
              },
            },
          ],
        },
        aggs: {
          group_name: {
            terms: { field: nameField, size: 1 },
          },
          signals: {
            terms: { field: 'signals', size: 10 },
          },
          pipeline_configs: {
            terms: { field: 'pipeline_config', size: 3 },
          },
          pipeline_configs_count: {
            cardinality: { field: 'pipeline_config' },
          },
          first_seen: {
            min: { field: 'enrolled_at' },
          },
          last_seen: {
            max: { field: 'last_checkin' },
          },
        },
      },
    },
  });

  const buckets = res.aggregations?.groups?.buckets ?? [];

  const hasNextPage = buckets.length > perPage;
  if (hasNextPage) {
    // remove last item if we have more than requested, this means there is a next page but we don't want to return the extra item
    buckets.pop();
  }
  const nextAfterKey = hasNextPage ? JSON.stringify(buckets[buckets.length - 1].key) : undefined;

  const items: CollectorGroup[] = buckets.map((bucket) => {
    const isUngrouped = bucket.key.group == null;
    const topPipelineConfigs = bucket.pipeline_configs.buckets.map((b) => b.key);
    const pipelineConfigsTotal = bucket.pipeline_configs_count.value;
    return {
      group: bucket.key.group ?? 'others',
      groupDisplayName: bucket.group_name.buckets[0]?.key ?? bucket.key.group ?? 'Others',
      docCount: bucket.doc_count,
      signals: bucket.signals.buckets.map((b) => b.key),
      ...(isUngrouped ? { isUngrouped: true } : {}),
      ...(topPipelineConfigs.length > 0
        ? { pipelineConfigs: { top: topPipelineConfigs, total: pipelineConfigsTotal } }
        : {}),
      ...(bucket.first_seen.value_as_string
        ? { firstSeen: bucket.first_seen.value_as_string }
        : {}),
      ...(bucket.last_seen.value_as_string ? { lastSeen: bucket.last_seen.value_as_string } : {}),
    };
  });

  return {
    items,
    ...(nextAfterKey ? { afterKey: nextAfterKey } : {}),
  };
}
