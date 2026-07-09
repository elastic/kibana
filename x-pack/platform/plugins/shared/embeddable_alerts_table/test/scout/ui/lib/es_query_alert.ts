/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import { v4 as uuidv4 } from 'uuid';
import type { ApiServicesFixture, KbnClient } from '@kbn/scout';

export const ES_QUERY_RULE_TAG = 'scout-embeddable-alerts';

const CONSUMER_VISIBILITY_TAG_PREFIX = 'scout-embeddable-consumer-vis';

export const CONSUMER_VISIBILITY_CONSUMERS = ['alerts', 'stackAlerts', 'logs'] as const;
export type ConsumerVisibilityConsumer = (typeof CONSUMER_VISIBILITY_CONSUMERS)[number];

// Always fires: counts docs in the (never empty) Kibana event log and alerts when > 0.
const ES_QUERY_RULE_PARAMS = {
  index: ['.kibana-event-log-*'],
  timeField: '@timestamp',
  esQuery: '{\n  "query":{\n    "match_all" : {}\n  }\n}',
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: '>',
  threshold: [0],
  searchType: 'esQuery',
  excludeHitsFromPreviousRun: false,
  aggType: 'count',
  groupBy: 'all',
} as const;

interface RacFindResponse {
  hits?: { hits?: unknown[] };
}

export interface EsQueryAlertState {
  ruleId: string;
}

// Polls the RAC find API until the rule has produced an active, searchable alert.
const waitForActiveAlert = async (
  kbnClient: KbnClient,
  ruleId: string,
  consumer: string,
  timeoutMs = 120_000
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await kbnClient.request<RacFindResponse>({
      method: 'POST',
      path: '/internal/rac/alerts/find',
      retries: 1,
      headers: { 'x-elastic-internal-origin': 'kibana' },
      body: {
        rule_type_ids: ['.es-query'],
        consumers: [consumer],
        query: {
          bool: {
            filter: [
              { term: { 'kibana.alert.rule.uuid': ruleId } },
              { term: { 'kibana.alert.status': 'active' } },
            ],
          },
        },
        size: 1,
      },
    });
    if ((data.hits?.hits?.length ?? 0) > 0) {
      return;
    }
    await delay(2_000);
  }
  throw new Error(`Timed out waiting for an active alert for rule ${ruleId}`);
};

// Creates an enabled `.es-query` rule and waits for a searchable active alert.
export const setupEsQueryAlert = async (
  apiServices: ApiServicesFixture,
  kbnClient: KbnClient
): Promise<EsQueryAlertState> => {
  const created = await apiServices.alerting.rules.create({
    name: `Scout embeddable alerts es-query ${Date.now()}`,
    ruleTypeId: '.es-query',
    consumer: 'stackAlerts',
    params: ES_QUERY_RULE_PARAMS as unknown as Record<string, unknown>,
    schedule: { interval: '1m' },
    enabled: true,
    tags: [ES_QUERY_RULE_TAG],
  });
  const ruleId = (created.data as { id: string }).id;

  await waitForActiveAlert(kbnClient, ruleId, 'stackAlerts');

  return { ruleId };
};

export const teardownEsQueryAlert = async (
  apiServices: ApiServicesFixture,
  state: EsQueryAlertState
): Promise<void> => {
  await apiServices.alerting.rules.delete(state.ruleId);
};

export interface ConsumerVisibilityRule {
  ruleId: string;
  consumer: ConsumerVisibilityConsumer;
  tag: string;
}

export interface ConsumerVisibilityRulesState {
  rules: ConsumerVisibilityRule[];
}

const createEsQueryRule = async (
  apiServices: ApiServicesFixture,
  consumer: ConsumerVisibilityConsumer,
  tag: string
): Promise<string> => {
  const created = await apiServices.alerting.rules.create({
    name: `Scout embeddable consumer visibility es-query (${consumer}) ${Date.now()}`,
    ruleTypeId: '.es-query',
    consumer,
    params: ES_QUERY_RULE_PARAMS as unknown as Record<string, unknown>,
    schedule: { interval: '1m' },
    enabled: true,
    tags: [tag],
  });

  return (created.data as { id: string }).id;
};

export const setupConsumerVisibilityRules = async (
  apiServices: ApiServicesFixture,
  kbnClient: KbnClient
): Promise<ConsumerVisibilityRulesState> => {
  const rules: ConsumerVisibilityRule[] = [];

  for (const consumer of CONSUMER_VISIBILITY_CONSUMERS) {
    const tag = `${CONSUMER_VISIBILITY_TAG_PREFIX}-${consumer}-${uuidv4()}`;
    const ruleId = await createEsQueryRule(apiServices, consumer, tag);
    await waitForActiveAlert(kbnClient, ruleId, consumer);
    rules.push({ ruleId, consumer, tag });
  }

  return { rules };
};

export const teardownConsumerVisibilityRules = async (
  apiServices: ApiServicesFixture,
  state: ConsumerVisibilityRulesState
): Promise<void> => {
  await Promise.all(state.rules.map(({ ruleId }) => apiServices.alerting.rules.delete(ruleId)));
};
