/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskErrorSource, getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { detectandThrowUserError } from './helpers';

describe('detectandThrowUserError', () => {
  const inferenceError = (statusCode: number, message: string) =>
    `Received an unsuccessful status code for request from inference entity id [.openai-gpt-5.4-mini-chat_completion] status [${statusCode}]. Error message: [${message}]`;

  const expectUserError = (error: string) => {
    try {
      detectandThrowUserError(error);
    } catch (e) {
      expect(getErrorSource(e)).toBe(TaskErrorSource.USER);
      return;
    }
    throw new Error(`Expected detectandThrowUserError to throw for: ${error}`);
  };

  describe('permanent client errors', () => {
    it.each([
      [401, 'Unauthorized'],
      [403, 'Forbidden'],
      [404, 'Not Found'],
    ])('throws a user error for status [%s]', (statusCode, message) => {
      expectUserError(inferenceError(statusCode, message));
    });

    it('throws a user error for an org-level EIS entitlement denial', () => {
      // Real message observed on a deployment whose org is not entitled to the LLM tier.
      expectUserError(inferenceError(403, 'Organization is not authorized to access any resource'));
    });

    it('throws a user error for a bare Forbidden 403', () => {
      // Real message observed from the EIS gateway on a different denial path.
      expectUserError(inferenceError(403, 'Forbidden'));
    });
  });

  describe('quota errors', () => {
    it('throws a user error for a 429 quota error', () => {
      expectUserError(inferenceError(429, 'You exceeded your current quota'));
    });
  });

  describe('retryable errors', () => {
    it.each([
      [429, 'Too Many Requests'],
      [500, 'Internal Server Error'],
      [502, 'Bad Gateway'],
      [503, 'Service Unavailable'],
    ])('does not throw for status [%s], leaving it retryable', (statusCode, message) => {
      expect(() => detectandThrowUserError(inferenceError(statusCode, message))).not.toThrow();
    });

    it('does not throw for an error with no status code', () => {
      expect(() => detectandThrowUserError('socket hang up')).not.toThrow();
    });

    it('does not throw when a permanent status code appears outside the status field', () => {
      // Guards against matching a bare number in free text, e.g. a token count or model name.
      expect(() =>
        detectandThrowUserError(inferenceError(500, 'upstream returned 403 for an internal call'))
      ).not.toThrow();
    });
  });
});
