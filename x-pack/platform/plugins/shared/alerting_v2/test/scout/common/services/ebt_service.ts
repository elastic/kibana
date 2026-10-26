/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type {
  RuleChangedEbtData,
  RuleEbtEventType,
} from '../../../../server/lib/telemetry/rule_ebt_schema';
import { COMMON_HEADERS } from '../constants';

const EBT_HELPERS_PATH = '/internal/analytics_ftr_helpers';
const DEFAULT_EVENT_TIMEOUT_MS = 10_000;

/** An EBT event as buffered by the `analytics_ftr_helpers` server shipper. */
export interface RuleChangedEbtEvent {
  event_type: string;
  timestamp: string;
  properties: RuleChangedEbtData;
}

export interface WaitForRuleChangedEventsParams {
  ruleId: string;
  eventType: RuleEbtEventType;
  /** Number of matching events to wait for. Defaults to 1. */
  count?: number;
  timeoutMs?: number;
}

/**
 * Test-time accessor for server-side EBT events. Requires the `analytics_ftr_helpers`
 * plugin, which the `alerting_v2` Scout server config set loads.
 */
export interface EbtService {
  /** Opts the server in to EBT so reported events reach the helpers shipper. */
  optIn: () => Promise<void>;
  /** Restores the opted-out default so later suites on the shared server stop shipping events. */
  optOut: () => Promise<void>;
  /**
   * Resolves with the rule-lifecycle events of `eventType` reported for the rule.
   * Returns as soon as `count` events arrived and throws if they do not within the timeout.
   */
  waitForRuleChangedEvents: (
    params: WaitForRuleChangedEventsParams
  ) => Promise<RuleChangedEbtEvent[]>;
}

export const getEbtService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): EbtService => {
  const setConsent = (consent: boolean) =>
    measurePerformanceAsync(log, consent ? 'ebt.optIn' : 'ebt.optOut', async () => {
      await kbnClient.request({
        method: 'POST',
        path: `${EBT_HELPERS_PATH}/opt_in`,
        headers: COMMON_HEADERS,
        query: { consent },
      });
    });

  return {
    optIn: () => setConsent(true),
    optOut: () => setConsent(false),
    waitForRuleChangedEvents: ({
      ruleId,
      eventType,
      count = 1,
      timeoutMs = DEFAULT_EVENT_TIMEOUT_MS,
    }) =>
      measurePerformanceAsync(log, `ebt.waitForRuleChangedEvents[${eventType}]`, async () => {
        const response = await kbnClient.request<RuleChangedEbtEvent[]>({
          method: 'GET',
          path: `${EBT_HELPERS_PATH}/events`,
          headers: COMMON_HEADERS,
          query: {
            takeNumberOfEvents: count,
            eventTypes: JSON.stringify([eventType]),
            withTimeoutMs: timeoutMs,
            filters: JSON.stringify({
              'properties.rule_id': { eq: ruleId },
            }),
          },
        });

        const events = response.data;
        if (events.length < count) {
          throw new Error(
            `Expected ${count} '${eventType}' event(s) for rule '${ruleId}' within ${timeoutMs}ms, received ${events.length}`
          );
        }
        return events;
      }),
  };
};
