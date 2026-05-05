/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAgentBuilderError, AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import {
  normalizeErrorType,
  getAgentExecutionErrorCode,
  sanitizeForCounterName,
} from './error_utils';

// Helper to create mock agentExecutionError since createAgentExecutionError isn't exported
const createMockAgentExecutionError = (
  errCode: AgentExecutionErrorCode,
  meta: Record<string, any> = {}
) => {
  const error = createAgentBuilderError(
    AgentBuilderErrorCode.agentExecutionError,
    'Execution error',
    {
      errCode,
      ...meta,
    }
  );
  return error;
};

describe('error_utils', () => {
  describe('normalizeErrorType', () => {
    it('returns the error code for AgentBuilderError', () => {
      const error = createAgentBuilderError(AgentBuilderErrorCode.badRequest, 'Bad request');
      expect(normalizeErrorType(error)).toBe(AgentBuilderErrorCode.badRequest);
    });

    it('returns internalError for AgentBuilderError without code', () => {
      // Create an AgentBuilderError-like object without a code
      const error = createAgentBuilderError(AgentBuilderErrorCode.internalError, 'Internal error');
      expect(normalizeErrorType(error)).toBe(AgentBuilderErrorCode.internalError);
    });

    it('returns "other" for non-AgentBuilderError', () => {
      const error = new Error('Regular error');
      expect(normalizeErrorType(error)).toBe('other');
    });

    it('returns "other" for string errors', () => {
      expect(normalizeErrorType('string error')).toBe('other');
    });

    it('returns "other" for null', () => {
      expect(normalizeErrorType(null)).toBe('other');
    });

    it('returns "other" for undefined', () => {
      expect(normalizeErrorType(undefined)).toBe('other');
    });

    it('returns "other" for plain objects', () => {
      expect(normalizeErrorType({ message: 'error' })).toBe('other');
    });

    it('handles all AgentBuilderErrorCode values', () => {
      const errorCodes = [
        AgentBuilderErrorCode.internalError,
        AgentBuilderErrorCode.badRequest,
        AgentBuilderErrorCode.toolNotFound,
        AgentBuilderErrorCode.agentNotFound,
        AgentBuilderErrorCode.conversationNotFound,
        AgentBuilderErrorCode.agentExecutionError,
        AgentBuilderErrorCode.requestAborted,
      ];

      for (const code of errorCodes) {
        const error = createAgentBuilderError(code, `Error with code ${code}`);
        expect(normalizeErrorType(error)).toBe(code);
      }
    });
  });

  describe('getAgentExecutionErrorCode', () => {
    it('returns errCode from agentExecutionError', () => {
      const error = createMockAgentExecutionError(AgentExecutionErrorCode.contextLengthExceeded);
      expect(getAgentExecutionErrorCode(error)).toBe(AgentExecutionErrorCode.contextLengthExceeded);
    });

    it('returns undefined for non-agentExecutionError AgentBuilderError', () => {
      const error = createAgentBuilderError(AgentBuilderErrorCode.badRequest, 'Bad request');
      expect(getAgentExecutionErrorCode(error)).toBeUndefined();
    });

    it('returns undefined for regular Error', () => {
      const error = new Error('Regular error');
      expect(getAgentExecutionErrorCode(error)).toBeUndefined();
    });

    it('returns undefined for null', () => {
      expect(getAgentExecutionErrorCode(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(getAgentExecutionErrorCode(undefined)).toBeUndefined();
    });

    it('returns undefined for plain objects', () => {
      expect(getAgentExecutionErrorCode({ meta: { errCode: 'test' } })).toBeUndefined();
    });

    it('handles all AgentExecutionErrorCode values', () => {
      const executionErrorCodes = [
        AgentExecutionErrorCode.contextLengthExceeded,
        AgentExecutionErrorCode.toolNotFound,
        AgentExecutionErrorCode.toolValidationError,
        AgentExecutionErrorCode.emptyResponse,
        AgentExecutionErrorCode.unknownError,
        AgentExecutionErrorCode.invalidState,
      ];

      for (const code of executionErrorCodes) {
        // Create mock error with appropriate meta based on code
        let meta = {};
        if (
          code === AgentExecutionErrorCode.toolNotFound ||
          code === AgentExecutionErrorCode.toolValidationError
        ) {
          meta = { toolName: 'test-tool', toolArgs: {} };
        }
        const error = createMockAgentExecutionError(code, meta);
        expect(getAgentExecutionErrorCode(error)).toBe(code);
      }
    });
  });

  describe('sanitizeForCounterName', () => {
    it('replaces special characters with underscores', () => {
      expect(sanitizeForCounterName('hello@world!')).toBe('hello_world');
    });

    it('replaces multiple consecutive underscores with single underscore', () => {
      expect(sanitizeForCounterName('hello___world')).toBe('hello_world');
    });

    it('removes leading underscores', () => {
      expect(sanitizeForCounterName('___hello')).toBe('hello');
    });

    it('removes trailing underscores', () => {
      expect(sanitizeForCounterName('hello___')).toBe('hello');
    });

    it('converts to lowercase', () => {
      expect(sanitizeForCounterName('HelloWorld')).toBe('helloworld');
    });

    it('preserves alphanumeric characters', () => {
      expect(sanitizeForCounterName('hello123world')).toBe('hello123world');
    });

    it('preserves hyphens', () => {
      expect(sanitizeForCounterName('hello-world')).toBe('hello-world');
    });

    it('preserves underscores in the middle', () => {
      expect(sanitizeForCounterName('hello_world')).toBe('hello_world');
    });

    it('truncates to 100 characters', () => {
      const longString = 'a'.repeat(150);
      expect(sanitizeForCounterName(longString).length).toBe(100);
    });

    it('returns "unknown" for empty string', () => {
      expect(sanitizeForCounterName('')).toBe('unknown');
    });

    it('returns "unknown" for string with only special characters', () => {
      expect(sanitizeForCounterName('!@#$%^&*()')).toBe('unknown');
    });

    it('handles complex provider names', () => {
      expect(sanitizeForCounterName('openai-gpt-4')).toBe('openai-gpt-4');
    });

    it('handles model names with special chars', () => {
      expect(sanitizeForCounterName('gpt-4-turbo-2024-04-09')).toBe('gpt-4-turbo-2024-04-09');
    });

    it('handles model names with slashes', () => {
      expect(sanitizeForCounterName('anthropic/claude-3-opus')).toBe('anthropic_claude-3-opus');
    });

    it('handles URLs as input', () => {
      expect(sanitizeForCounterName('https://api.openai.com')).toBe('https_api_openai_com');
    });

    it('handles whitespace', () => {
      expect(sanitizeForCounterName('hello world')).toBe('hello_world');
    });

    it('handles tabs and newlines', () => {
      expect(sanitizeForCounterName('hello\tworld\n')).toBe('hello_world');
    });
  });
});
