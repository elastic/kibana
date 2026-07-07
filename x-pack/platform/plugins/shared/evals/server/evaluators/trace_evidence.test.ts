/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceAccessor } from './types';
import { extractTraceEvidence } from './trace_evidence';
import { extractConversationEvidence } from './chat_evidence';
import { extractToolEvidence } from './tool_evidence';

jest.mock('./chat_evidence');
jest.mock('./tool_evidence');

const extractConversationEvidenceMock = extractConversationEvidence as jest.Mock;
const extractToolEvidenceMock = extractToolEvidence as jest.Mock;

describe('extractTraceEvidence', () => {
  const traceId = '0af7651916cd43dd8448eb211c80319c';
  const traceAccessor: TraceAccessor = {
    traceId,
    esClient: {} as TraceAccessor['esClient'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns tool evidence when the trace root is a tool, without reading the conversation', async () => {
    extractToolEvidenceMock.mockResolvedValueOnce({
      user_query: '{"query":"errors last hour"}',
      agent_response: '{"esql":"FROM logs"}',
    });

    await expect(extractTraceEvidence(traceAccessor)).resolves.toEqual({
      user_query: '{"query":"errors last hour"}',
      agent_response: '{"esql":"FROM logs"}',
    });
    // Tool path is checked first; when it matches we must NOT grade the nested
    // LLM conversation (the tool's internal prompt).
    expect(extractConversationEvidenceMock).not.toHaveBeenCalled();
  });

  it('falls back to conversation evidence when the root is not a tool', async () => {
    extractToolEvidenceMock.mockResolvedValueOnce(null);
    extractConversationEvidenceMock.mockResolvedValueOnce({
      user_query: 'list the indices',
      agent_response: 'here are the indices',
    });

    await expect(extractTraceEvidence(traceAccessor)).resolves.toEqual({
      user_query: 'list the indices',
      agent_response: 'here are the indices',
    });
    expect(extractToolEvidenceMock).toHaveBeenCalledTimes(1);
    expect(extractConversationEvidenceMock).toHaveBeenCalledTimes(1);
  });

  it('throws an actionable error when neither tool nor conversation evidence exists', async () => {
    extractToolEvidenceMock.mockResolvedValueOnce(null);
    extractConversationEvidenceMock.mockResolvedValueOnce(null);

    await expect(extractTraceEvidence(traceAccessor)).rejects.toThrow(/No gen_ai evidence found/);
  });

  it('propagates tool extractor errors without falling back', async () => {
    extractToolEvidenceMock.mockRejectedValueOnce(new Error('ES query failed'));

    await expect(extractTraceEvidence(traceAccessor)).rejects.toThrow('ES query failed');
    expect(extractConversationEvidenceMock).not.toHaveBeenCalled();
  });
});
