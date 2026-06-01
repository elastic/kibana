/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAgentContext } from '@kbn/workflows-hitl-common';
import type { AgentContext } from '@kbn/workflows-hitl-common';

/** Alias for {@link AgentContext} — preserved for consumers that imported it from get_execution_state. */
export type WaitingInputAgentContext = AgentContext;

export interface WaitingInputContext {
  /** Step execution document id for the paused `waitForInput` instance. Compare across status polls. */
  step_execution_id: string;
  /** Human-readable prompt from the waitForInput step's `with.message`. */
  message?: string;
  /** JSON Schema describing the expected input, from the step's `with.schema`. */
  schema?: Record<string, unknown>;
  /** Agent reasoning + intended tool that caused the HITL pause (S5, nested HITL only). */
  agent_context?: AgentContext;
}

interface StepConfig {
  message?: string;
  schema?: Record<string, unknown>;
}

interface WaitingStep {
  id: string;
  input?: Record<string, unknown>;
}

/**
 * Constructs the full {@link WaitingInputContext} from a paused step execution and its step config.
 *
 * Priority: stepConfig fields take precedence; stepInput fields are used when stepConfig is absent
 * (non-waitForInput steps, e.g. ai.agent, receive their input via setInput() in the engine).
 */
export const resolveWaitingInputContext = ({
  stepConfig,
  waitingStep,
}: {
  stepConfig: StepConfig | undefined;
  waitingStep: WaitingStep;
}): WaitingInputContext => {
  // Only read stepInput when there is no static stepConfig (i.e. the step is not a waitForInput).
  const stepInput = stepConfig === undefined ? waitingStep.input : undefined;

  const message =
    stepConfig?.message ?? (typeof stepInput?.message === 'string' ? stepInput.message : undefined);

  const schema =
    stepConfig?.schema ??
    (stepInput?.schema && typeof stepInput.schema === 'object' && !Array.isArray(stepInput.schema)
      ? (stepInput.schema as Record<string, unknown>)
      : undefined);

  const agentContext = parseAgentContext(stepInput?.agent_context);

  return {
    step_execution_id: waitingStep.id,
    ...(message !== undefined && { message }),
    ...(schema !== undefined && { schema }),
    ...(agentContext !== undefined && { agent_context: agentContext }),
  };
};
