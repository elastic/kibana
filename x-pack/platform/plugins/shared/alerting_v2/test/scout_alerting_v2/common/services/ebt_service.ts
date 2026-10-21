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
import {
  WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
  type WorkflowDispatchedEbtData,
} from '../../../../server/lib/telemetry/workflow_ebt_schema';
import { COMMON_HEADERS, POLL_TIMEOUT_MS } from '../constants';

const EBT_HELPERS_PATH = '/internal/analytics_ftr_helpers';
const DEFAULT_EVENT_TIMEOUT_MS = 10_000;

/** An EBT event as buffered by the `analytics_ftr_helpers` server shipper. */
export interface EbtEvent<TProps> {
  event_type: string;
  timestamp: string;
  properties: TProps;
}

export type RuleChangedEbtEvent = EbtEvent<RuleChangedEbtData>;
export type WorkflowDispatchedEbtEvent = EbtEvent<WorkflowDispatchedEbtData>;

export interface WaitForEventsOptions {
  /** Number of matching events to wait for. Defaults to 1. */
  count?: number;
  timeoutMs?: number;
}

export interface WaitForRuleChangedEventsParams extends WaitForEventsOptions {
  ruleId: string;
  eventType: RuleEbtEventType;
}

export interface WaitForWorkflowDispatchedEventsParams extends WaitForEventsOptions {
  workflowId: string;
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
   * Resolves with the `alerting_v2_workflow_dispatched` events reported for the workflow.
   * Returns as soon as `count` events arrived and throws if they do not within the timeout.
   */
  waitForWorkflowDispatchedEvents: (
    params: WaitForWorkflowDispatchedEventsParams
  ) => Promise<WorkflowDispatchedEbtEvent[]>;
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

  /**
   * Waits on the helpers plugin's long poll for events of `eventType` whose `filter.key`
   * property equals `filter.value`. Throws if fewer than `count` arrive within `timeoutMs`.
   */
  const waitForEvents = <TProps>({
    eventType,
    filter,
    subject,
    label,
    count,
    timeoutMs,
  }: {
    eventType: string;
    filter: { key: string; value: string };
    /** Names the entity waited on in the error message, for example `rule 'abc'`. */
    subject: string;
    label: string;
    count: number;
    timeoutMs: number;
  }) =>
    measurePerformanceAsync(log, `ebt.${label}`, async () => {
      const { data: events } = await kbnClient.request<Array<EbtEvent<TProps>>>({
        method: 'GET',
        path: `${EBT_HELPERS_PATH}/events`,
        headers: COMMON_HEADERS,
        query: {
          takeNumberOfEvents: count,
          eventTypes: JSON.stringify([eventType]),
          withTimeoutMs: timeoutMs,
          filters: JSON.stringify({ [filter.key]: { eq: filter.value } }),
        },
      });

      if (events.length < count) {
        throw new Error(
          `Expected ${count} '${eventType}' event(s) for ${subject} within ${timeoutMs}ms, received ${events.length}`
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
      waitForEvents<RuleChangedEbtData>({
        eventType,
        filter: { key: 'properties.rule_id', value: ruleId },
        subject: `rule '${ruleId}'`,
        label: `waitForRuleChangedEvents[${eventType}]`,
        count,
        timeoutMs,
      }),
    // Dispatch is paced by Task Manager and the dispatcher tick, so it takes longer to reach
    // telemetry than a rule change, which is reported synchronously with the API call.
    waitForWorkflowDispatchedEvents: ({ workflowId, count = 1, timeoutMs = POLL_TIMEOUT_MS }) =>
      waitForEvents<WorkflowDispatchedEbtData>({
        eventType: WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
        filter: { key: 'properties.workflow_id', value: workflowId },
        subject: `workflow '${workflowId}'`,
        label: 'waitForWorkflowDispatchedEvents',
        count,
        timeoutMs,
      }),
  };
};
