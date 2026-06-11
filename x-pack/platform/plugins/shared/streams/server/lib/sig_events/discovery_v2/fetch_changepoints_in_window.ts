/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { TAG_RULE_ON_RULE } from '../rule_on_rule/constants';
import { extractMonitoredRuleIdFromTags, extractStreamNameFromTags } from '../rule_on_rule/tags';
import { getColumnIndex, toEsqlRequest } from '../../streams/helpers/esql';

export interface DiscoveryChangepointCandidate {
  ruleOnRuleId: string;
  monitoredRuleId: string;
  streamName: string;
  ruleOnRuleName: string;
  timestamp: string;
  changepointType?: string;
  pvalue?: number;
  data: Record<string, unknown>;
}

export interface FetchDiscoveryChangepointsResult {
  candidates: DiscoveryChangepointCandidate[];
  ruleOnRuleRuleIds: string[];
}

interface RuleOnRuleMeta {
  ruleId: string;
  name: string;
  tags: string[];
}

async function listRuleOnRuleRules(rulesClient: RulesClientApi): Promise<RuleOnRuleMeta[]> {
  const { items } = await rulesClient.findRules({
    filter: `metadata.tags: "${TAG_RULE_ON_RULE}"`,
    perPage: 500,
  });

  return items.map((rule) => ({
    ruleId: rule.id,
    name: rule.metadata.name,
    tags: rule.metadata.tags ?? [],
  }));
}

/**
 * Reads `.rule-events` for recent changepoint rows written by rule-on-rule signal rules.
 * Used as the source of truth after the Discovery workflow debounce window.
 */
export async function fetchDiscoveryChangepointsInWindow({
  esClient,
  rulesClient,
  lookback,
}: {
  esClient: IScopedClusterClient;
  rulesClient: RulesClientApi;
  lookback: string;
}): Promise<FetchDiscoveryChangepointsResult> {
  const ruleOnRules = await listRuleOnRuleRules(rulesClient);
  if (ruleOnRules.length === 0) {
    return { candidates: [], ruleOnRuleRuleIds: [] };
  }

  const metaByRuleId = new Map(ruleOnRules.map((rule) => [rule.ruleId, rule]));
  const ruleIdLiterals = ruleOnRules.map((rule) => esql.str(rule.ruleId));

  const response = await esClient.asCurrentUser.esql.query({
    ...toEsqlRequest(
      esql.from(['.rule-events']).where`rule.id IN (${ruleIdLiterals})`.where`type == ${esql.str(
        'signal'
      )}`.pipe`SORT @timestamp DESC`.pipe`LIMIT 500`
    ),
    filter: {
      bool: {
        filter: [{ range: { '@timestamp': { gte: lookback } } }],
      },
    },
    drop_null_columns: false,
  });

  const ruleIdIdx = getColumnIndex(response, 'rule.id');
  const timestampIdx = getColumnIndex(response, '@timestamp');
  const dataIdx = getColumnIndex(response, 'data');

  if (ruleIdIdx === -1 || timestampIdx === -1) {
    return { candidates: [], ruleOnRuleRuleIds: ruleOnRules.map((r) => r.ruleId) };
  }

  const candidates: DiscoveryChangepointCandidate[] = [];

  for (const row of response.values) {
    const ruleOnRuleId = row[ruleIdIdx] as string;
    const meta = metaByRuleId.get(ruleOnRuleId);
    if (!meta) {
      continue;
    }

    const data = (dataIdx >= 0 ? row[dataIdx] : {}) as Record<string, unknown>;
    const changepointType = typeof data.type === 'string' ? data.type : undefined;

    if (!changepointType) {
      continue;
    }

    const monitoredRuleId = extractMonitoredRuleIdFromTags(meta.tags);
    if (!monitoredRuleId) {
      continue;
    }

    candidates.push({
      ruleOnRuleId,
      monitoredRuleId,
      streamName: extractStreamNameFromTags(meta.tags),
      ruleOnRuleName: meta.name,
      timestamp: row[timestampIdx] as string,
      changepointType,
      pvalue: typeof data.pvalue === 'number' ? data.pvalue : undefined,
      data,
    });
  }

  return {
    candidates,
    ruleOnRuleRuleIds: ruleOnRules.map((r) => r.ruleId),
  };
}

export interface InvestigatorV2Detection {
  detection_id: string;
  rule_on_rule_id: string;
  monitored_rule_id: string;
  rule_uuid: string;
  rule_name: string;
  rule_on_rule_name: string;
  stream_name: string;
  changepoint_type: string;
  change_point_type: string;
  detected_at: string;
  detection_evidence: {
    change_point_type: string;
    p_value?: number;
  };
}

/**
 * Normalizes `.rule-events` changepoint rows into the investigator `detections` batch shape.
 */
export function formatDiscoveryChangepointsForInvestigator(
  candidates: DiscoveryChangepointCandidate[]
): InvestigatorV2Detection[] {
  return candidates.map((candidate) => ({
    detection_id: `${candidate.ruleOnRuleId}:${candidate.timestamp}`,
    rule_on_rule_id: candidate.ruleOnRuleId,
    monitored_rule_id: candidate.monitoredRuleId,
    rule_uuid: candidate.monitoredRuleId,
    rule_name: candidate.ruleOnRuleName,
    rule_on_rule_name: candidate.ruleOnRuleName,
    stream_name: candidate.streamName,
    changepoint_type: candidate.changepointType ?? 'unknown',
    change_point_type: candidate.changepointType ?? 'unknown',
    detected_at: candidate.timestamp,
    detection_evidence: {
      change_point_type: candidate.changepointType ?? 'unknown',
      ...(candidate.pvalue !== undefined ? { p_value: candidate.pvalue } : {}),
    },
  }));
}
