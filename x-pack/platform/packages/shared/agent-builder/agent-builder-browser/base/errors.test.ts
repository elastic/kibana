/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInternalError,
  createToolNotFoundError,
  AgentBuilderErrorCode,
  createAgentBuilderError,
  createAgentNotFoundError,
} from '@kbn/agent-builder-common';

import { formatAgentBuilderErrorMessage } from './errors';

describe('AgentBuilder errors', () => {
  describe('formatAgentBuilderErrorMessage', () => {
    it('should format AgentBuilderError instances correctly', () => {
      const internalError = createInternalError('Internal server error');
      expect(formatAgentBuilderErrorMessage(internalError)).toBe('Internal server error');

      const toolNotFoundError = createToolNotFoundError({ toolId: 'missing-tool' });
      expect(formatAgentBuilderErrorMessage(toolNotFoundError)).toBe('Tool missing-tool not found');

      const agentNotFoundError = createAgentNotFoundError({ agentId: 'missing-agent' });
      expect(formatAgentBuilderErrorMessage(agentNotFoundError)).toBe(
        'Agent missing-agent not found'
      );
    });

    it('should format generic JavaScript errors correctly', () => {
      const jsError = new Error('Something went wrong');
      expect(formatAgentBuilderErrorMessage(jsError)).toBe('Something went wrong');

      const typeError = new TypeError('Invalid type');
      expect(formatAgentBuilderErrorMessage(typeError)).toBe('Invalid type');
    });

    it('should handle string inputs', () => {
      expect(formatAgentBuilderErrorMessage('Simple error message')).toBe('Simple error message');
    });

    it('should handle falsy values', () => {
      expect(formatAgentBuilderErrorMessage(null)).toBe('null');
      expect(formatAgentBuilderErrorMessage(undefined)).toBe('undefined');
    });

    it('should handle HTTP response errors with body.message', () => {
      const httpError = createAgentBuilderError(AgentBuilderErrorCode.badRequest, 'test error', {
        statusCode: 400,
      });
      expect(formatAgentBuilderErrorMessage(httpError)).toBe('test error');
    });
  });
});
