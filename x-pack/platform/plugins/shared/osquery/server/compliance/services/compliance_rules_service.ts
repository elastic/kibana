/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import {
  COMPLIANCE_RULE_SO_TYPE,
  COMPLIANCE_BENCHMARK_STATE_SO_TYPE,
} from '../../../common/compliance';
import type {
  ComplianceRuleMetadata,
  ComplianceBenchmarkInfo,
  MutedRulesState,
} from '../../../common/compliance';
import { getMutedRuleKey } from '../../../common/compliance';

const escapeKql = (value: string): string => value.replace(/["\\]/g, '\\$&');

export const findComplianceRules = async (
  soClient: SavedObjectsClientContract,
  options: {
    benchmarkId?: string;
    platform?: string;
    section?: string;
    level?: number;
    enabled?: boolean;
    page?: number;
    perPage?: number;
    search?: string;
  } = {}
) => {
  const { page = 1, perPage = 20, search, ...filters } = options;

  const filterParts: string[] = [];
  if (filters.benchmarkId) {
    filterParts.push(
      `${COMPLIANCE_RULE_SO_TYPE}.attributes.benchmark.id: "${escapeKql(filters.benchmarkId)}"`
    );
  }

  if (filters.platform) {
    filterParts.push(
      `${COMPLIANCE_RULE_SO_TYPE}.attributes.platform: "${escapeKql(filters.platform)}"`
    );
  }

  if (filters.section) {
    filterParts.push(
      `${COMPLIANCE_RULE_SO_TYPE}.attributes.section: "${escapeKql(filters.section)}"`
    );
  }

  if (filters.level !== undefined) {
    filterParts.push(`${COMPLIANCE_RULE_SO_TYPE}.attributes.level: ${filters.level}`);
  }

  if (filters.enabled !== undefined) {
    filterParts.push(`${COMPLIANCE_RULE_SO_TYPE}.attributes.enabled: ${filters.enabled}`);
  }

  const result = await soClient.find<ComplianceRuleMetadata>({
    type: COMPLIANCE_RULE_SO_TYPE,
    page,
    perPage,
    filter: filterParts.length > 0 ? filterParts.join(' AND ') : undefined,
    search,
    searchFields: ['name', 'description'],
    sortField: 'name',
    sortOrder: 'asc',
  });

  return {
    total: result.total,
    page: result.page,
    per_page: result.per_page,
    rules: result.saved_objects.map((so) => ({ id: so.id, ...so.attributes })),
  };
};

export const getComplianceRule = async (soClient: SavedObjectsClientContract, id: string) => {
  const so = await soClient.get<ComplianceRuleMetadata>(COMPLIANCE_RULE_SO_TYPE, id);

  return { id: so.id, ...so.attributes };
};

export const createComplianceRule = async (
  soClient: SavedObjectsClientContract,
  rule: ComplianceRuleMetadata
) => {
  const so = await soClient.create<ComplianceRuleMetadata>(
    COMPLIANCE_RULE_SO_TYPE,
    {
      ...rule,
      prebuilt: false,
    },
    { id: rule.rule_id }
  );

  return { id: so.id, ...so.attributes };
};

export const updateComplianceRule = async (
  soClient: SavedObjectsClientContract,
  id: string,
  updates: Partial<ComplianceRuleMetadata>
) => {
  await soClient.update(COMPLIANCE_RULE_SO_TYPE, id, updates);

  return getComplianceRule(soClient, id);
};

export const deleteComplianceRule = async (soClient: SavedObjectsClientContract, id: string) => {
  const existing = await soClient.get<ComplianceRuleMetadata>(COMPLIANCE_RULE_SO_TYPE, id);
  if (existing.attributes.prebuilt) {
    throw new Error('Cannot delete prebuilt compliance rules. Disable it instead.');
  }

  await soClient.delete(COMPLIANCE_RULE_SO_TYPE, id);
};

export const bulkActionComplianceRules = async (
  soClient: SavedObjectsClientContract,
  action: 'enable' | 'disable' | 'mute' | 'unmute',
  ruleIds: string[]
) => {
  if (action === 'mute' || action === 'unmute') {
    return bulkMuteRules(soClient, action === 'mute', ruleIds);
  }

  const updates = ruleIds.map((id) => ({
    type: COMPLIANCE_RULE_SO_TYPE,
    id,
    attributes: { enabled: action === 'enable' },
  }));

  await soClient.bulkUpdate(updates);

  return { updated: ruleIds.length };
};

const BENCHMARK_STATE_SO_ID = 'compliance-benchmark-state';

export const getMutedRulesState = async (
  soClient: SavedObjectsClientContract
): Promise<MutedRulesState> => {
  try {
    const so = await soClient.get<{ muted_rules: MutedRulesState }>(
      COMPLIANCE_BENCHMARK_STATE_SO_TYPE,
      BENCHMARK_STATE_SO_ID
    );

    return so.attributes.muted_rules ?? {};
  } catch {
    return {};
  }
};

const bulkMuteRules = async (
  soClient: SavedObjectsClientContract,
  mute: boolean,
  ruleIds: string[]
) => {
  const currentState = await getMutedRulesState(soClient);
  const bulkResult = await soClient.bulkGet<ComplianceRuleMetadata>(
    ruleIds.map((id) => ({ type: COMPLIANCE_RULE_SO_TYPE, id }))
  );
  const rules = bulkResult.saved_objects.filter((so) => !so.error);

  for (const ruleSo of rules) {
    const { benchmark, rule_number } = ruleSo.attributes;
    const key = getMutedRuleKey(benchmark.id, benchmark.version, rule_number);
    currentState[key] = {
      muted: mute,
      benchmark_id: benchmark.id,
      benchmark_version: benchmark.version,
      rule_number,
      muted_at: mute ? new Date().toISOString() : undefined,
    };
  }

  try {
    await soClient.update(COMPLIANCE_BENCHMARK_STATE_SO_TYPE, BENCHMARK_STATE_SO_ID, {
      muted_rules: currentState,
    });
  } catch {
    await soClient.create(
      COMPLIANCE_BENCHMARK_STATE_SO_TYPE,
      { muted_rules: currentState },
      { id: BENCHMARK_STATE_SO_ID }
    );
  }

  return { updated: ruleIds.length };
};

export const listBenchmarks = async (
  soClient: SavedObjectsClientContract
): Promise<ComplianceBenchmarkInfo[]> => {
  const allRules = await soClient.find<ComplianceRuleMetadata>({
    type: COMPLIANCE_RULE_SO_TYPE,
    perPage: 0,
    aggs: {
      benchmarks: {
        terms: { field: `${COMPLIANCE_RULE_SO_TYPE}.attributes.benchmark.id`, size: 50 },
        aggs: {
          benchmark_name: {
            terms: {
              field: `${COMPLIANCE_RULE_SO_TYPE}.attributes.benchmark.name.keyword`,
              size: 1,
            },
          },
          benchmark_version: {
            terms: { field: `${COMPLIANCE_RULE_SO_TYPE}.attributes.benchmark.version`, size: 1 },
          },
          platforms: {
            terms: { field: `${COMPLIANCE_RULE_SO_TYPE}.attributes.platform`, size: 10 },
          },
          levels: {
            terms: { field: `${COMPLIANCE_RULE_SO_TYPE}.attributes.level`, size: 5 },
          },
          enabled_count: {
            filter: { term: { [`${COMPLIANCE_RULE_SO_TYPE}.attributes.enabled`]: true } },
          },
        },
      },
    },
  });

  const aggBuckets = (allRules.aggregations?.benchmarks as any)?.buckets ?? [];

  return aggBuckets.map((bucket: any) => ({
    id: bucket.key,
    name: bucket.benchmark_name?.buckets?.[0]?.key ?? bucket.key,
    version: bucket.benchmark_version?.buckets?.[0]?.key ?? 'v1.0.0',
    total_rules: bucket.doc_count,
    enabled_rules: bucket.enabled_count?.doc_count ?? 0,
    platforms: (bucket.platforms?.buckets ?? []).map((p: any) => p.key),
    levels: (bucket.levels?.buckets ?? []).map((l: any) => l.key),
  }));
};
