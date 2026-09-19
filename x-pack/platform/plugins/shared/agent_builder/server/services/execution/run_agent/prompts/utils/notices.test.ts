/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAIMessage, isHumanMessage, isToolMessage } from '@langchain/core/messages';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import type { BackgroundExecutionState } from '@kbn/agent-builder-common/chat';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import {
  EXECUTION_FAILED_NOTICE_MAX_LENGTH,
  createCycleLimitSystemMessage,
  formatExecutionFailedNotice,
  formatHandover,
  formatRetryNotice,
  formatSubagentRosterNotice,
  formatSystemNotice,
} from './notices';

const makeCompletedExecution = (
  overrides: Partial<BackgroundExecutionState> = {}
): BackgroundExecutionState => ({
  execution_id: 'exec-123',
  status: ExecutionStatus.completed,
  response: { message: 'The task is done.' },
  completed_at: { round_id: 'round-1' },
  ...overrides,
});

const makeFailedExecution = (
  overrides: Partial<BackgroundExecutionState> = {}
): BackgroundExecutionState => ({
  execution_id: 'exec-456',
  status: ExecutionStatus.failed,
  error: { code: 'internalError' as never, message: 'LLM timeout' },
  completed_at: { round_id: 'round-1' },
  ...overrides,
});

describe('createCycleLimitSystemMessage', () => {
  it('renders a user-side system notice with the remaining cycles', () => {
    const message = createCycleLimitSystemMessage(5);
    expect(isHumanMessage(message)).toBe(true);
    expect(message.content).toContain('<system-notice>');
    expect(message.content).toContain('You only have 5 cycles');
  });
});

describe('formatHandover', () => {
  it('renders the handover notes as an AI turn followed by the dispatcher ack', () => {
    const [ai, user] = formatHandover({ message: 'found 3 errors', forceful: false });
    expect(isAIMessage(ai)).toBe(true);
    expect(ai.content).toContain('Handover notes for the answering agent');
    expect(ai.content).toContain('found 3 errors');
    expect(isHumanMessage(user)).toBe(true);
    expect(user.content).toContain('[dispatcher] Ack.');
  });

  it('renders the forceful variant without the notes', () => {
    const [ai, user] = formatHandover({ message: '', forceful: true });
    expect(ai.content).toContain('exceeded the maximum allowed steps');
    expect(ai.content).not.toContain('Handover notes');
    expect(user.content).toContain('[dispatcher] Ack.');
  });
});

describe('formatRetryNotice', () => {
  it('renders a tool-not-found error as a failed tool call', () => {
    const error = createAgentExecutionError('no such tool', AgentExecutionErrorCode.toolNotFound, {
      toolName: 'ghost',
      toolArgs: { a: 1 },
    });
    const [call, result] = formatRetryNotice(error);
    expect(isAIMessage(call)).toBe(true);
    expect((call as any).tool_calls).toEqual([
      expect.objectContaining({ name: 'ghost', args: { a: 1 } }),
    ]);
    expect(isToolMessage(result)).toBe(true);
    expect(result.content).toContain('ERROR: tool_not_found');
    expect((result as any).tool_call_id).toBe((call as any).tool_calls[0].id);
  });

  it('renders a validation error as a failed tool call carrying the validation message', () => {
    const error = createAgentExecutionError(
      'bad args',
      AgentExecutionErrorCode.toolValidationError,
      { toolName: 'my_tool', toolArgs: '{"broken', validationError: 'q is required' }
    );
    const [call, result] = formatRetryNotice(error);
    expect((call as any).tool_calls[0].args).toEqual({ args: '{"broken' });
    expect(result.content).toContain('ERROR: tool_validation_error');
    expect(result.content).toContain('q is required');
  });

  it('renders an empty response as a placeholder AI turn and a nudge', () => {
    const error = createAgentExecutionError('empty', AgentExecutionErrorCode.emptyResponse, {});
    const [ai, user] = formatRetryNotice(error);
    expect(isAIMessage(ai)).toBe(true);
    expect(ai.content).toBe('...');
    expect(isHumanMessage(user)).toBe(true);
    expect(user.content).toContain('did not provide any answer');
  });

  it('renders nothing for non-recoverable errors', () => {
    const error = createAgentExecutionError('boom', AgentExecutionErrorCode.unknownError, {});
    expect(formatRetryNotice(error)).toEqual([]);
  });
});

describe('formatSubagentRosterNotice', () => {
  it('lists the roster entries in a system notice', () => {
    const notice = formatSubagentRosterNotice([
      { name: 'researcher', purpose: 'digs into logs' } as never,
    ]);
    expect(notice).toContain('researcher');
    expect(notice).toContain('digs into logs');
  });
});

describe('formatSystemNotice', () => {
  it('formats a completed execution as a system notice with result', () => {
    const notice = formatSystemNotice(makeCompletedExecution());

    expect(notice).toContain('<system_notice>');
    expect(notice).toContain('</system_notice>');
    expect(notice).toContain('<execution-id>exec-123</execution-id>');
    expect(notice).toContain('<status>completed</status>');
    expect(notice).toContain('<result>The task is done.</result>');
    expect(notice).not.toContain('<error>');
  });

  it('formats a failed execution as a system notice with error', () => {
    const notice = formatSystemNotice(makeFailedExecution());

    expect(notice).toContain('<system_notice>');
    expect(notice).toContain('has failed');
    expect(notice).toContain('<execution-id>exec-456</execution-id>');
    expect(notice).toContain('<status>failed</status>');
    expect(notice).toContain('<error>LLM timeout</error>');
    expect(notice).not.toContain('<result>');
  });

  it('uses "No response" when completed execution has no response', () => {
    const notice = formatSystemNotice(makeCompletedExecution({ response: undefined }));

    expect(notice).toContain('<result>No response</result>');
  });
});

describe('formatExecutionFailedNotice', () => {
  it('renders a system_notice with the error code as an attribute and the message escaped', () => {
    const notice = formatExecutionFailedNotice({
      code: 'internalError',
      message: 'bad <tag> & "quote" ] newline\nnext',
    } as never);

    expect(notice).toContain('<system_notice>');
    // the apostrophe is escaped like everything else
    expect(notice).toContain(
      'The agent&apos;s attempt to answer the previous message failed. No response was produced.'
    );
    expect(notice).toContain('<error code="internalError">');
    expect(notice).toContain('bad &lt;tag&gt; &amp;');
    expect(notice).not.toContain('<tag>');
  });

  it('renders the cause chain under the error, outermost first, escaped and bounded', () => {
    const notice = formatExecutionFailedNotice({
      code: 'internalError',
      message: 'Error executing agent: Error calling connector',
      causes: [
        { name: 'Error', message: 'Error calling connector', code: 'connector_error' },
        { name: 'Error', message: `status <404> ${'z'.repeat(10_000)}` },
      ],
    } as never);

    const causes = [...notice.matchAll(/<cause(?: code="([^"]*)")?>([\s\S]*?)<\/cause>/g)];
    expect(causes).toHaveLength(2);
    expect(causes[0][1]).toBe('connector_error');
    expect(causes[0][2].trim()).toBe('Error calling connector');
    expect(causes[1][1]).toBeUndefined();
    expect(causes[1][2]).toContain('status &lt;404&gt;');
    // bounded before escaping: the 10 kB tail is cut, marked with an ellipsis
    expect(causes[1][2].trim().endsWith('…')).toBe(true);
    expect(causes[1][2]).not.toContain('z'.repeat(EXECUTION_FAILED_NOTICE_MAX_LENGTH));
  });

  it('truncates long messages to the bound', () => {
    const notice = formatExecutionFailedNotice({
      code: 'internalError',
      message: 'x'.repeat(10_000),
    } as never);

    const rendered = /<error code="internalError">([\s\S]*?)<\/error>/.exec(notice)![1].trim();
    expect(rendered).toBe(`${'x'.repeat(EXECUTION_FAILED_NOTICE_MAX_LENGTH)}…`);
  });
});
