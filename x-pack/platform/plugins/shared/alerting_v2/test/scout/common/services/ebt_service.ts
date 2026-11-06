/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type {
  ActionPolicyChangedEbtData,
  ActionPolicyEbtEventType,
} from '../../../../server/lib/telemetry/action_policy_ebt_schema';
import type {
  AlertActionAppliedEbtData,
  AlertActionEbtEventType,
} from '../../../../server/lib/telemetry/alert_action_ebt_schema';
import type {
  RuleChangedEbtData,
  RuleEbtEventType,
} from '../../../../server/lib/telemetry/rule_ebt_schema';
import { COMMON_HEADERS } from '../constants';

const EBT_HELPERS_PATH = '/internal/analytics_ftr_helpers';
const DEFAULT_EVENT_TIMEOUT_MS = 10_000;

/** An EBT event as buffered by the `analytics_ftr_helpers` server shipper. */
interface BufferedEbtEvent<TProperties> {
  event_type: string;
  timestamp: string;
  properties: TProperties;
}

export type RuleChangedEbtEvent = BufferedEbtEvent<RuleChangedEbtData>;

export type ActionPolicyChangedEbtEvent = BufferedEbtEvent<ActionPolicyChangedEbtData>;

export type AlertActionAppliedEbtEvent = BufferedEbtEvent<AlertActionAppliedEbtData>;

export interface WaitForRuleChangedEventsParams {
  ruleId: string;
  eventType: RuleEbtEventType;
  /** Number of matching events to wait for. Defaults to 1. */
  count?: number;
  timeoutMs?: number;
}

export interface WaitForActionPolicyChangedEventsParams {
  actionPolicyId: string;
  eventType: ActionPolicyEbtEventType;
  /** Number of matching events to wait for. Defaults to 1. */
  count?: number;
  timeoutMs?: number;
}

export interface WaitForAlertActionEventsParams {
  ruleId: string;
  eventType: AlertActionEbtEventType;
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
  /**
   * Resolves with the action policy change events of `eventType` reported for the policy.
   * Returns as soon as `count` events arrived and throws if they do not within the timeout.
   */
  waitForActionPolicyChangedEvents: (
    params: WaitForActionPolicyChangedEventsParams
  ) => Promise<ActionPolicyChangedEbtEvent[]>;
  /**
   * Resolves with the alert-action events of `eventType` reported for the rule.
   * Returns as soon as `count` events arrived and throws if they do not within the timeout.
   */
  waitForAlertActionEvents: (
    params: WaitForAlertActionEventsParams
  ) => Promise<AlertActionAppliedEbtEvent[]>;
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

  const waitForEvents = <TEvent>({
    eventType,
    idProperty,
    id,
    count,
    timeoutMs,
  }: {
    eventType: string;
    idProperty: string;
    id: string;
    count: number;
    timeoutMs: number;
  }) =>
    measurePerformanceAsync(log, `ebt.waitForEvents[${eventType}]`, async () => {
      const response = await kbnClient.request<TEvent[]>({
        method: 'GET',
        path: `${EBT_HELPERS_PATH}/events`,
        headers: COMMON_HEADERS,
        query: {
          takeNumberOfEvents: count,
          eventTypes: JSON.stringify([eventType]),
          withTimeoutMs: timeoutMs,
          filters: JSON.stringify({
            [`properties.${idProperty}`]: { eq: id },
          }),
        },
      });

      const events = response.data;
      if (events.length < count) {
        throw new Error(
          `Expected ${count} '${eventType}' event(s) for ${idProperty} '${id}' within ${timeoutMs}ms, received ${events.length}`
        );
      }
      return events;
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
      waitForEvents<RuleChangedEbtEvent>({
        eventType,
        idProperty: 'rule_id',
        id: ruleId,
        count,
        timeoutMs,
      }),
    waitForActionPolicyChangedEvents: ({
      actionPolicyId,
      eventType,
      count = 1,
      timeoutMs = DEFAULT_EVENT_TIMEOUT_MS,
    }) =>
      waitForEvents<ActionPolicyChangedEbtEvent>({
        eventType,
        idProperty: 'action_policy_id',
        id: actionPolicyId,
        count,
        timeoutMs,
      }),
    waitForAlertActionEvents: ({
      ruleId,
      eventType,
      count = 1,
      timeoutMs = DEFAULT_EVENT_TIMEOUT_MS,
    }) =>
      waitForEvents<AlertActionAppliedEbtEvent>({
        eventType,
        idProperty: 'rule_id',
        id: ruleId,
        count,
        timeoutMs,
      }),
  };
};
