/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { getEmitterWorkflowExecutionIdFromRequest } from '@kbn/workflows-extensions/server';

/** A workflow run dispatched the action, through an osquery step or a `kibana.request` step. */
export interface WorkflowActionOrigin {
  type: 'workflow';
  /** The workflow execution (run) that made the request. */
  run_id: string;
  /**
   * Whether Kibana verified that the run exists and made the request. Always `false` until
   * execution IDs can be verified (security-team#20085).
   */
  verified: false;
}

/**
 * What started an osquery action, written to the action document as `origin`. A union keyed by
 * `type`, shaped as planned in security-team#20087, so a new origin adds a member with its own
 * fields and a matching mapping entry.
 */
export type ActionOrigin = WorkflowActionOrigin;

const RUN_ID_PATTERN = /^[A-Za-z0-9._:-]{1,256}$/;

/**
 * The workflow origin of a request, or `undefined` when it did not come from a workflow run.
 *
 * The workflow engine's `callKibanaApi` handles every Kibana call a workflow makes, from osquery
 * steps and from generic `kibana.request` steps alike. It sets `x-kibana-workflow-execution-id`
 * itself, drops any value a step supplies, and marks the call as internal-origin. So the header
 * identifies the run without any osquery-specific header.
 *
 * Only internal-origin requests count, as in `getEventChainContext`. That stops naive spoofing
 * from public API callers, but it is not a trust boundary: `isInternalApiRequest` only checks
 * that `x-elastic-internal-origin` is present, and Kibana cannot yet verify an execution ID. So
 * the origin is recorded with `verified: false`. Treat it as attribution, not authorization.
 *
 * Store the run ID only: there is no public execution-to-workflow lookup contract, and
 * `x-kibana-event-chain-visited-workflows` is not reliable for workflow attribution. Its caps
 * are MAX_VISITED_IDS_IN_HEADER (128 IDs) and MAX_VISITED_IDS_HEADER_BYTES (64 KiB); truncation
 * drops IDs from the end, so the current, last-appended workflow can be dropped and the tail
 * can name an earlier workflow at the chain-depth cap.
 */
export const resolveWorkflowOrigin = (
  request: Pick<KibanaRequest, 'headers' | 'isInternalApiRequest'>
): WorkflowActionOrigin | undefined => {
  if (!request.isInternalApiRequest) {
    return undefined;
  }

  // The shared reader takes the first value of a repeated header and trims it.
  const runId = getEmitterWorkflowExecutionIdFromRequest(request as KibanaRequest);

  // Compare the whole match because `$` can also match before a final newline. The pattern also
  // rejects comma-joined values, which is how Node merges a repeated custom header.
  if (runId === undefined || runId.match(RUN_ID_PATTERN)?.[0] !== runId) {
    return undefined;
  }

  return { type: 'workflow', run_id: runId, verified: false };
};
