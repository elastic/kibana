/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveWaitingInputContext } from '.';

describe('resolveWaitingInputContext', () => {
  describe('message and schema from stepConfig', () => {
    it('returns message and schema from stepConfig when both are present', () => {
      const result = resolveWaitingInputContext({
        stepConfig: {
          message: 'Please approve this request',
          schema: {
            type: 'object',
            properties: { approved: { type: 'boolean' }, reason: { type: 'string' } },
            required: ['approved'],
          },
        },
        waitingStep: { id: 'step-exec-1' },
      });

      expect(result).toEqual({
        agent_context: undefined,
        message: 'Please approve this request',
        schema: {
          type: 'object',
          properties: { approved: { type: 'boolean' }, reason: { type: 'string' } },
          required: ['approved'],
        },
        step_execution_id: 'step-exec-1',
      });
    });

    it('returns message only from stepConfig when schema is absent', () => {
      const result = resolveWaitingInputContext({
        stepConfig: { message: 'Provide input' },
        waitingStep: { id: 'step-exec-2' },
      });

      expect(result).toEqual({
        agent_context: undefined,
        message: 'Provide input',
        schema: undefined,
        step_execution_id: 'step-exec-2',
      });
    });

    it('does not read stepInput when stepConfig is defined', () => {
      const result = resolveWaitingInputContext({
        stepConfig: { message: 'From config' },
        waitingStep: {
          id: 'step-exec-3',
          input: {
            agent_context: {
              intended_tool: 'hitl.form',
              intended_tool_args: {},
              reasoning: 'Should not appear',
            },
            message: 'From input (should be ignored)',
            schema: { type: 'object' },
          },
        },
      });

      expect(result.message).toBe('From config');
      expect(result.schema).toBeUndefined();
      expect(result.agent_context).toBeUndefined();
    });
  });

  describe('fallback to stepInput when no stepConfig', () => {
    it('returns message from stepInput when stepConfig is undefined', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: { id: 'step-exec-4', input: { message: 'From step input' } },
      });

      expect(result.message).toBe('From step input');
      expect(result.step_execution_id).toBe('step-exec-4');
    });

    it('returns schema from stepInput when stepConfig is undefined', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: {
          id: 'step-exec-5',
          input: { schema: { type: 'object', properties: { x: { type: 'string' } } } },
        },
      });

      expect(result.schema).toEqual({ type: 'object', properties: { x: { type: 'string' } } });
    });

    it('omits schema when stepInput.schema is not a plain object', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: { id: 'step-exec-6', input: { schema: ['not', 'an', 'object'] } },
      });

      expect(result.schema).toBeUndefined();
    });

    it('omits message when stepInput.message is not a string', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: { id: 'step-exec-7', input: { message: 42 } },
      });

      expect(result.message).toBeUndefined();
    });
  });

  describe('agent_context handling', () => {
    it('includes agent_context when valid (all required fields present)', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: {
          id: 'step-exec-8',
          input: {
            agent_context: {
              intended_tool: 'hitl.form',
              intended_tool_args: { key: 'val' },
              reasoning: 'I need human approval',
            },
          },
        },
      });

      expect(result.agent_context).toEqual({
        intended_tool: 'hitl.form',
        intended_tool_args: { key: 'val' },
        reasoning: 'I need human approval',
      });
    });

    it('includes agent_context with intended_tool_args defaulting to {} when absent', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: {
          id: 'step-exec-9',
          input: {
            agent_context: {
              intended_tool: 'hitl.form',
              reasoning: 'No args provided',
            },
          },
        },
      });

      expect(result.agent_context).toEqual({
        intended_tool: 'hitl.form',
        intended_tool_args: {},
        reasoning: 'No args provided',
      });
    });

    it('returns undefined agent_context when agent_context is invalid (missing reasoning)', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: {
          id: 'step-exec-10',
          input: { agent_context: { intended_tool: 'hitl.form' } },
        },
      });

      expect(result.agent_context).toBeUndefined();
    });

    it('returns undefined agent_context when agent_context is an array', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: {
          id: 'step-exec-11',
          input: { agent_context: ['not', 'valid'] },
        },
      });

      expect(result.agent_context).toBeUndefined();
    });

    it('returns undefined agent_context when agent_context is missing from input', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: { id: 'step-exec-12', input: { message: 'No agent context here' } },
      });

      expect(result.agent_context).toBeUndefined();
    });
  });

  describe('no stepConfig and no input', () => {
    it('returns only step_execution_id when waitingStep has no input', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: { id: 'step-exec-13' },
      });

      expect(result).toEqual({
        agent_context: undefined,
        message: undefined,
        schema: undefined,
        step_execution_id: 'step-exec-13',
      });
    });
  });

  describe('iteration / loop step shapes', () => {
    it('uses the correct step_execution_id for a waiting iteration step', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: {
          id: 'step-exec-iter-1-waiting',
          input: { message: 'Approve iteration 1' },
        },
      });

      expect(result.step_execution_id).toBe('step-exec-iter-1-waiting');
      expect(result.message).toBe('Approve iteration 1');
    });

    it('handles nested foreach step input with agent_context', () => {
      const result = resolveWaitingInputContext({
        stepConfig: undefined,
        waitingStep: {
          id: 'step-exec-nested',
          input: {
            agent_context: {
              intended_tool: 'hitl.form',
              intended_tool_args: { loop_index: 2 },
              reasoning: 'Nested loop requires approval',
            },
            message: 'Approve nested step',
            schema: { type: 'object', properties: { approved: { type: 'boolean' } } },
          },
        },
      });

      expect(result).toEqual({
        agent_context: {
          intended_tool: 'hitl.form',
          intended_tool_args: { loop_index: 2 },
          reasoning: 'Nested loop requires approval',
        },
        message: 'Approve nested step',
        schema: { type: 'object', properties: { approved: { type: 'boolean' } } },
        step_execution_id: 'step-exec-nested',
      });
    });
  });
});
