/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_TRACE_TRANSCRIPTS_BATCH_TOKENS,
  type TraceTranscriptMemory,
} from '../../common/step_types/read_trace_transcripts';
import { batchByConversation } from './trace_batches';

const MAX_STEP_SIZE_BYTES = 10 * 1024 * 1024;
const CHARS_PER_TOKEN = 4;
/** The `max_tokens` the managed trace dreaming workflow reads with. */
const WORKFLOW_MAX_TOKENS = 600_000;

const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8');

const roundsFor = (totalTokens: number, roundTokens: number): TraceTranscriptMemory[] =>
  Array.from({ length: Math.floor(totalTokens / roundTokens) }, (_, index) => ({
    id: `trace:${index.toString(16).padStart(8, '0')}`,
    type: 'trace.round',
    title: `Round ${index}`,
    content: 'a'.repeat(roundTokens * CHARS_PER_TOKEN),
    updated_at: '2026-11-12T08:00:00.000Z',
    attributes: { 'trace.id': `${index}`, 'trace.conversation_id': `c${index % 40}` },
    permissions: { kibana: { privileges: [{ space: 'default' }] } },
  }));

/**
 * The size of what `context-engine.readTraceTranscripts` returns, the payload the engine persists
 * as the step output and again wherever a workflow passes it on, measured on synthetic rounds of
 * the managed workflow's cap.
 */
describe('trace read output size', () => {
  const memories = roundsFor(WORKFLOW_MAX_TOKENS, 2_000);
  const batches = batchByConversation(memories, DEFAULT_TRACE_TRANSCRIPTS_BATCH_TOKENS);
  const output = { memories, batches, resume_from: '2026-11-12T08:00:00.000Z', sources: [] };

  it('returns every round twice, as memories and as batches', () => {
    const transcriptBytes = bytes(memories);
    const batchBytes = bytes(batches);
    expect(batchBytes / transcriptBytes).toBeGreaterThan(0.99);
    expect(batchBytes / transcriptBytes).toBeLessThan(1.05);
    expect(bytes(output) / transcriptBytes).toBeGreaterThan(1.99);
  });

  it('is between 4.5 and 5 MiB at the managed workflow cap', () => {
    expect(bytes(output)).toBeGreaterThan(4.5 * 1024 * 1024);
    expect(bytes(output)).toBeLessThan(5 * 1024 * 1024);
  });

  it('stays under the default step size limit at the managed workflow cap', () => {
    expect(bytes(output)).toBeLessThan(MAX_STEP_SIZE_BYTES);
  });

  it('passes the step size limit a little over twice the managed workflow cap', () => {
    const doubled = roundsFor(WORKFLOW_MAX_TOKENS * 2.2, 2_000);
    const doubledOutput = {
      memories: doubled,
      batches: batchByConversation(doubled, DEFAULT_TRACE_TRANSCRIPTS_BATCH_TOKENS),
    };
    expect(bytes(doubledOutput)).toBeGreaterThan(MAX_STEP_SIZE_BYTES);
  });
});
