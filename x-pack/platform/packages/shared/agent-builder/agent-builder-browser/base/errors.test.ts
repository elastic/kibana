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

    it('should show a friendly message for 413 responses, whatever the body', () => {
      const withBody = Object.assign(new Error('Request Entity Too Large'), {
        response: { status: 413 },
        body: {
          statusCode: 413,
          message: 'Payload content length greater than maximum allowed: 1048576',
        },
      });
      const withoutBody = Object.assign(new Error('Payload Too Large'), {
        response: { status: 413 },
      });

      expect(formatAgentBuilderErrorMessage(withBody)).toMatch(/too large to send/);
      expect(formatAgentBuilderErrorMessage(withoutBody)).toMatch(/too large to send/);
    });

    it('should include the status code of HTTP errors without a body message', () => {
      const httpError = Object.assign(new Error('Bad Gateway'), { response: { status: 502 } });
      expect(formatAgentBuilderErrorMessage(httpError)).toBe('Bad Gateway (HTTP 502)');
    });

    it('should show the status code of HTTP errors with an empty status text', () => {
      const httpError = Object.assign(new Error(''), { response: { status: 502 } });
      expect(formatAgentBuilderErrorMessage(httpError)).toBe('Request failed (HTTP 502)');
    });

    it('should prefer the body message over the status code', () => {
      const httpError = Object.assign(new Error('Internal Server Error'), {
        response: { status: 500 },
        body: { message: 'Something specific' },
      });
      expect(formatAgentBuilderErrorMessage(httpError)).toBe('Something specific');
    });
  });
});
