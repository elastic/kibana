/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import {
  buildTrajectory,
  renderFinalAnswer,
  getConversationTraceId,
  runGoldenInvestigation,
} from './task';

describe('conversation trajectory', () => {
  it('uses the latest agent trace across string and array round formats', () => {
    expect(getConversationTraceId([{ trace_id: 'first' }, { trace_id: ['second', 'third'] }])).toBe(
      'third'
    );
    expect(getConversationTraceId([{ trace_id: 'single' }])).toBe('single');
    expect(getConversationTraceId([{}])).toBeUndefined();
  });

  it('pairs each call with a capped result, preserves errors and ends with the final answer', () => {
    const trajectory = buildTrajectory(
      [
        { type: ConversationRoundStepType.reasoning, reasoning: 'Inspect the signal' },
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'call-1',
          tool_id: 'bash',
          params: { command: 'echo sample' },
          results: [
            {
              tool_result_id: 'result-1',
              type: ToolResultType.other,
              data: { stdout: 'a'.repeat(3000) },
            },
          ],
        },
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'call-2',
          tool_id: 'bash',
          params: { command: 'false' },
          results: [
            {
              tool_result_id: 'result-2',
              type: ToolResultType.error,
              data: { message: 'Command failed' },
            },
          ],
        },
      ],
      'The signal is unavailable.'
    );
    expect(trajectory.map(({ step_type }) => step_type)).toEqual([
      'tool_call',
      'tool_result',
      'tool_call',
      'tool_result',
      'response',
    ]);
    expect(trajectory[0]).toMatchObject({
      tool_name: 'bash',
      tool_args: { command: 'echo sample' },
      content: 'Called bash: echo sample',
    });
    expect(trajectory[1].tool_output).toHaveLength(2000);
    expect(trajectory[3]).toMatchObject({
      success: false,
      content: expect.stringContaining('Command failed'),
    });
    expect(trajectory[4].content).toBe('The signal is unavailable.');
  });
});

describe('structured final answer', () => {
  it('keeps absent failure reports empty so missing-evidence graders retain their null semantics', () => {
    expect(renderFinalAnswer({})).toBe('');
    expect(renderFinalAnswer({ hypotheses: [], recommendations: [], blind_spots: [] })).toBe('');
  });

  it('renders ranked hypotheses, confidence and recommendations without mutating the report', () => {
    const hypotheses = [
      {
        candidate: 'Traffic',
        confidence: 0.2,
        status: 'dismissed' as const,
        reason: 'Flat traffic',
      },
      {
        candidate: 'Deployment',
        confidence: 0.8,
        status: 'confirmed' as const,
        reason: 'Errors followed deployment',
      },
    ];
    const answer = renderFinalAnswer({
      conclusion: 'Deployment caused errors',
      severity: '60-high',
      hypotheses,
      recommendations: [
        { title: 'Revert deployment', confidence: 0.8, description: 'Restore the prior version' },
      ],
      blind_spots: [{ title: 'Missing traces', confidence: 1, description: 'No request traces' }],
    });
    expect(answer).toContain('## Conclusion\nDeployment caused errors');
    expect(answer).toContain('Severity: 60-high');
    expect(answer).toContain('1. Deployment — confirmed; confidence: 80%');
    expect(answer).toContain('2. Traffic — dismissed; confidence: 20%');
    expect(answer).toContain('Revert deployment');
    expect(answer).toContain('No request traces');
    expect(hypotheses[0].candidate).toBe('Traffic');
  });
});

describe('failed investigation evidence', () => {
  it('retains the investigate-step error and absent report when conversation retrieval also fails', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce({ investigation_id: 'investigation' })
      .mockResolvedValueOnce({
        status: 'failed',
        conversation_id: 'conversation',
        error: 'Workflow failed',
      })
      .mockResolvedValueOnce({
        status: 'failed',
        stepExecutions: [{ stepId: 'investigate', error: { message: 'Model unavailable' } }],
      })
      .mockRejectedValueOnce(new Error('Conversation unavailable'));
    const result = await runGoldenInvestigation(fetch, {
      input: { question: 'Investigate synthetic signal' },
      output: { reference_answer: 'Synthetic cause' },
      metadata: { langsmith_example_id: 'source', max_latency_seconds: 300, dataset_split: [] },
    });
    expect(result).toMatchObject({
      investigation_id: 'investigation',
      conversation_id: 'conversation',
      workflow_status: 'failed',
      execution_error: 'Model unavailable',
      final_answer: '',
      structured_report: null,
    });
  });
});
