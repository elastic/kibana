/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractConversationEvidence } from './chat_evidence';
import { extractToolEvidence } from './tool_evidence';
import type { TraceAccessor, TraceEvidence } from './types';

/**
 * Reconstructs LLM-judge evidence (`user_query` / `agent_response`) from a trace
 * using OTel Gen AI semantic conventions, independent of how the trace was
 * produced. This is the trace-first evaluator contract (issue #254971): judges
 * depend only on a trace id (+ reference data), so the same evaluators run in CI
 * and against production traces.
 *
 * A trace can contain more than one gradable layer (e.g. an agent conversation
 * that internally calls a tool). We grade the OUTERMOST semantic layer, keyed on
 * the trace's ROOT span:
 *
 * - We check the tool path FIRST. An LLM-backed tool runs its own inference
 *   inside the tool span, and that nested call emits `gen_ai.user.message` /
 *   `gen_ai.choice` on the SAME trace (only the outermost inference span
 *   detaches). So a conversation-first check would grade the tool's *internal*
 *   prompt for bare tool runs. `extractToolEvidence` returns evidence only when
 *   the trace ROOT is an `execute_tool` span, so a conversation that merely calls
 *   a tool (agent/chain at the root) still falls through to the conversation
 *   path — the conversation/agent path is unchanged.
 * - Otherwise we reconstruct conversation evidence (`gen_ai.user.message` /
 *   `gen_ai.choice`).
 */
export const extractTraceEvidence = async (
  traceAccessor: TraceAccessor
): Promise<TraceEvidence> => {
  const toolEvidence = await extractToolEvidence(traceAccessor);
  if (toolEvidence) {
    return toolEvidence;
  }

  const conversationEvidence = await extractConversationEvidence(traceAccessor);
  if (conversationEvidence) {
    return conversationEvidence;
  }

  throw new Error(
    `No gen_ai evidence found for trace ${traceAccessor.traceId}. ` +
      `Trace-first evaluators reconstruct evidence from OTel Gen AI semantic conventions: ` +
      `a conversation (gen_ai.user.message / gen_ai.choice in "logs-*") or a tool execution ` +
      `(an execute_tool span's gen_ai.tool.call.arguments / gen_ai.tool.call.result in "traces-*"). ` +
      `Ensure OpenTelemetry tracing with message-content capture is enabled for the evaluated ` +
      `target and that traces are exported (e.g. via the EDOT collector).`
  );
};
