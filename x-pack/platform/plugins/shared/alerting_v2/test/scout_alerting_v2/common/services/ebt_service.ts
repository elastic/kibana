/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { COMMON_HEADERS } from '../constants';
import type { RuleChangedEventData } from '../../../../server/lib/telemetry/rule_changed_event';

const RULE_CHANGED_EVENT_TYPE = 'alerting_v2_rule_changed';
const EBT_HELPERS_PATH = '/internal/analytics_ftr_helpers';
const DEFAULT_EVENT_TIMEOUT_MS = 10_000;

/** An EBT event as buffered by the `analytics_ftr_helpers` server shipper. */
export interface RuleChangedEbtEvent {
  event_type: string;
  timestamp: string;
  properties: RuleChangedEventData;
}

export interface WaitForRuleChangedEventsParams {
  ruleId: string;
  operation: RuleChangedEventData['operation'];
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
  /**
   * Resolves with the `alerting_v2_rule_changed` events reported for the rule and operation.
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
  const optIn = () =>
    measurePerformanceAsync(log, 'ebt.optIn', async () => {
      await kbnClient.request({
        method: 'POST',
        path: `${EBT_HELPERS_PATH}/opt_in`,
        headers: COMMON_HEADERS,
        query: { consent: true },
      });
    });

  return {
    optIn,
    waitForRuleChangedEvents: ({
      ruleId,
      operation,
      count = 1,
      timeoutMs = DEFAULT_EVENT_TIMEOUT_MS,
    }) =>
      measurePerformanceAsync(log, `ebt.waitForRuleChangedEvents[${operation}]`, async () => {
        const response = await kbnClient.request<RuleChangedEbtEvent[]>({
          method: 'GET',
          path: `${EBT_HELPERS_PATH}/events`,
          headers: COMMON_HEADERS,
          query: {
            takeNumberOfEvents: count,
            eventTypes: JSON.stringify([RULE_CHANGED_EVENT_TYPE]),
            withTimeoutMs: timeoutMs,
            filters: JSON.stringify({
              'properties.rule_id': { eq: ruleId },
              'properties.operation': { eq: operation },
            }),
          },
        });

        const events = response.data;
        if (events.length < count) {
          throw new Error(
            `Expected ${count} '${RULE_CHANGED_EVENT_TYPE}' event(s) for rule '${ruleId}' with operation '${operation}' within ${timeoutMs}ms, received ${events.length}`
          );
        }
        return events;
      }),
  };
};
