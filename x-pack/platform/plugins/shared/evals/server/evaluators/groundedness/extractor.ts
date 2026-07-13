/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { normalizeEvidence } from '../evidence/evidence_service';
import { getEvidenceMapping } from '../evidence/resolve_mapping';
import { createTraceAccessor } from '../trace_accessor';
import type { TraceAccessor } from '../types';

interface GroundednessEvidence {
  user_query: string;
  agent_response: string;
  tool_call_history: Array<{
    tool_call_id?: string;
    tool_id?: string;
    arguments?: unknown;
    result?: unknown;
  }>;
}

export class IncompleteGroundednessEvidenceError extends Error {
  constructor(public readonly evidence: GroundednessEvidence, options?: { cause?: unknown }) {
    super('Groundedness evidence may be incomplete', options);
    this.name = 'IncompleteGroundednessEvidenceError';
  }
}

const DEFAULT_EVIDENCE_MAPPING = getEvidenceMapping('elastic-inference');

export const extractGroundednessEvidence = async (
  traceAccessor: TraceAccessor,
  log: Logger
): Promise<GroundednessEvidence> => {
  const round = await normalizeEvidence(
    createTraceAccessor(traceAccessor),
    DEFAULT_EVIDENCE_MAPPING
  );

  const baseEvidence: GroundednessEvidence = {
    user_query: round.input.message,
    agent_response: round.response.message,
    tool_call_history: [],
  };

  if (!round.response.message.trim()) {
    const incompleteEvidence: GroundednessEvidence = {
      ...baseEvidence,
      agent_response: '',
      tool_call_history: [],
    };
    log.warn(`Returning incomplete groundedness evidence for trace ${traceAccessor.traceId}.`);
    throw new IncompleteGroundednessEvidenceError(incompleteEvidence);
  }

  return {
    ...baseEvidence,
    tool_call_history: round.steps,
  };
};
