/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceAccessor } from './types';
import { normalizeEvidence } from './evidence/evidence_service';
import { getEvidenceMapping } from './evidence/resolve_mapping';
import { createTraceAccessor } from './trace_accessor';

export const extractChatEvidence = async (
  traceAccessor: TraceAccessor
): Promise<{ user_query: string; agent_response: string }> => {
  const round = await normalizeEvidence(
    createTraceAccessor(traceAccessor),
    getEvidenceMapping('elastic-inference')
  );
  if (!round.input.message) {
    throw new Error(`No user message span events found for trace ${traceAccessor.traceId}`);
  }

  return {
    user_query: round.input.message,
    agent_response: round.response.message,
  };
};
