/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInternalError,
  createToolNotFoundError,
  OnechatErrorCode,
  createOnechatError,
  createAgentNotFoundError,
} from '@kbn/onechat-common';

import { formatOnechatErrorMessage } from './errors';

describe('Onechat errors', () => {
  describe('formatOnechatErrorMessage', () => {
    it('should format OnechatError instances correctly', () => {
      const internalError = createInternalError('Internal server error');
      expect(formatOnechatErrorMessage(internalError)).toBe('Internal server error');

      const toolNotFoundError = createToolNotFoundError({ toolId: 'missing-tool' });
      expect(formatOnechatErrorMessage(toolNotFoundError)).toBe('Tool missing-tool not found');

      const agentNotFoundError = createAgentNotFoundError({ agentId: 'missing-agent' });
      expect(formatOnechatErrorMessage(agentNotFoundError)).toBe('Agent missing-agent not found');
    });

    it('should format generic JavaScript errors correctly', () => {
      const jsError = new Error('Something went wrong');
      expect(formatOnechatErrorMessage(jsError)).toBe('Something went wrong');

      const typeError = new TypeError('Invalid type');
      expect(formatOnechatErrorMessage(typeError)).toBe('Invalid type');
    });

    it('should handle string inputs', () => {
      expect(formatOnechatErrorMessage('Simple error message')).toBe('Simple error message');
    });

    it('should handle falsy values', () => {
      expect(formatOnechatErrorMessage(null)).toBe('null');
      expect(formatOnechatErrorMessage(undefined)).toBe('undefined');
    });

    it('should handle HTTP response errors with body.message', () => {
      const httpError = createOnechatError(OnechatErrorCode.badRequest, 'test error', {
        statusCode: 400,
      });
      expect(formatOnechatErrorMessage(httpError)).toBe('test error');
    });
  });
});
