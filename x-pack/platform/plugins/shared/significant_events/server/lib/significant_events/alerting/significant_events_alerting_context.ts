/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { QUERY_TYPE_STATS, type QueryType } from '@kbn/significant-events-schema';
import type { IRulesManagementClient } from '../../knowledge_indicators/knowledge_indicator_client/rules/rules_management_client';
import { RulesAdapterV2 } from '../../knowledge_indicators/knowledge_indicator_client/rules/v2_rules_adapter';
import type { ISignificantEventsAlertsReader } from './alerts_reader';
import { ALERTS_READER_V2 } from './alerts_reader';

export interface SignificantEventsAlertingContext {
  readonly alertsReader: ISignificantEventsAlertsReader;
  readonly rulesClient: IRulesManagementClient;
  /**
   * The raw alerting v2 rules client. Exposed for the maintenance (pause/resume)
   * flow, which toggles `enabled` directly on v2 signal rules; regular rule CRUD
   * goes through `rulesClient`.
   */
  readonly alertingV2RulesClient: RulesClientApi;
}

export interface ResolveSignificantEventsAlertingContextParams {
  getAlertingV2RulesClient: () => Promise<RulesClientApi>;
}

/** MATCH queries can be rule-backed; STATS cannot until rule-on-rule provisioning (#265778). */
export function canQueryBeRuleBacked(queryType: QueryType): boolean {
  return queryType !== QUERY_TYPE_STATS;
}

/**
 * Returns a resolver scoped to one request. The first call starts async setup
 * and later calls reuse the same promise via `??=`.
 */
export function createSignificantEventsAlertingContextResolver(
  params: ResolveSignificantEventsAlertingContextParams
): () => Promise<SignificantEventsAlertingContext> {
  let promise: Promise<SignificantEventsAlertingContext> | undefined;

  return () => {
    // Nullish coalescing assignment: run the async IIFE once, then return the cached promise.
    promise ??= (async () => {
      const alertingV2RulesClient = await params.getAlertingV2RulesClient();
      return {
        alertsReader: ALERTS_READER_V2,
        rulesClient: new RulesAdapterV2(alertingV2RulesClient),
        alertingV2RulesClient,
      };
    })();
    return promise;
  };
}
