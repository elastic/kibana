/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorTelemetryMetadata } from '@kbn/inference-common';

/**
 * Connector telemetry for every LLM call of one execution: the caller's metadata, plus the
 * execution's trace id and, for a top-level execution a workflow started, its workflow run as the
 * `interactionId` EIS receives. A caller-supplied `interactionId` is kept.
 */
export const buildExecutionTelemetryMetadata = ({
  parentExecutionId,
  telemetryMetadata,
  traceId,
  workflowExecutionId,
}: {
  /**
   * Set when the execution is a sub-agent of another one. A sub-agent's LLM calls don't carry the
   * workflow run, so only the main agent's loop does, the same calls #294510 covers.
   */
  parentExecutionId?: string;
  telemetryMetadata?: ConnectorTelemetryMetadata;
  traceId?: string;
  /** The workflow run whose `ai.agent` step started the execution, inherited by its sub-agents. */
  workflowExecutionId?: string;
}): ConnectorTelemetryMetadata | undefined => {
  const workflowInteractionId = parentExecutionId ? undefined : workflowExecutionId;
  const interactionId = telemetryMetadata?.interactionId ?? workflowInteractionId;
  if (!traceId && !interactionId) {
    return telemetryMetadata;
  }

  return {
    ...telemetryMetadata,
    ...(traceId ? { traceId } : {}),
    ...(interactionId ? { interactionId } : {}),
  };
};
