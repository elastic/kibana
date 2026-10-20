/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import {
  WORKFLOW_DISPATCHED_EBT_EVENT_TYPE,
  type WorkflowDispatchedEbtData,
} from '../../../../server/lib/telemetry/workflow_ebt_schema';
import { COMMON_HEADERS, POLL_TIMEOUT_MS } from '../constants';

const EBT_HELPERS_PATH = '/internal/analytics_ftr_helpers';

/** An EBT event as buffered by the `analytics_ftr_helpers` server shipper. */
export interface WorkflowDispatchedEbtEvent {
  event_type: string;
  timestamp: string;
  properties: WorkflowDispatchedEbtData;
}

export interface WaitForWorkflowDispatchedEventsParams {
  workflowId: string;
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
  /** Restores the default consent so later suites sharing the server do not keep shipping events. */
  optOut: () => Promise<void>;
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
  const setConsent = async (consent: boolean) => {
    await kbnClient.request({
      method: 'POST',
      path: `${EBT_HELPERS_PATH}/opt_in`,
      headers: COMMON_HEADERS,
      query: { consent },
    });
  };

  const optIn = () => measurePerformanceAsync(log, 'ebt.optIn', async () => setConsent(true));
  const optOut = () => measurePerformanceAsync(log, 'ebt.optOut', async () => setConsent(false));

  return {
    optIn,
    optOut,
    waitForWorkflowDispatchedEvents: ({
      workflowId,
      count = 1,
      timeoutMs = POLL_TIMEOUT_MS,
    }) =>
      measurePerformanceAsync(log, 'ebt.waitForWorkflowDispatchedEvents', async () => {
        const response = await kbnClient.request<WorkflowDispatchedEbtEvent[]>({
          method: 'GET',
          path: `${EBT_HELPERS_PATH}/events`,
          headers: COMMON_HEADERS,
          query: {
            takeNumberOfEvents: count,
            eventTypes: JSON.stringify([WORKFLOW_DISPATCHED_EBT_EVENT_TYPE]),
            withTimeoutMs: timeoutMs,
            filters: JSON.stringify({
              'properties.workflow_id': { eq: workflowId },
            }),
          },
        });

        const events = response.data;
        if (events.length < count) {
          throw new Error(
            `Expected ${count} '${WORKFLOW_DISPATCHED_EBT_EVENT_TYPE}' event(s) for workflow '${workflowId}' within ${timeoutMs}ms, received ${events.length}`
          );
        }
        return events;
      }),
  };
};
