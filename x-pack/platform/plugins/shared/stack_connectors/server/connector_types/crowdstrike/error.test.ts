/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CrowdstrikeError } from './error';

describe('CrowdstrikeError', () => {
  describe('constructor', () => {
    it('should parse status code and message from formatted error message', () => {
      const error = new CrowdstrikeError('Status code: 401. Message: Unauthorized access');

      expect(error.code).toBe(401);
      expect(error.message).toBe('Unauthorized access');
    });

    it('should parse status code and message with complex message content', () => {
      const complexMessage =
        'Status code: 400. Message: Invalid parameter: endpoint_ids must be an array';
      const error = new CrowdstrikeError(complexMessage);

      expect(error.code).toBe(400);
      expect(error.message).toBe('Invalid parameter: endpoint_ids must be an array');
    });

    it('should fallback to default values when message format does not match regex', () => {
      const error = new CrowdstrikeError('Some unexpected error format');

      expect(error.code).toBe(500);
      expect(error.message).toBe('Some unexpected error format');
    });

    it('should handle empty message string', () => {
      const error = new CrowdstrikeError('');

      expect(error.code).toBe(500);
      expect(error.message).toBe('Unknown Crowdstrike error'); // Empty string triggers fallback message
    });

    it('should handle message with only status code', () => {
      const error = new CrowdstrikeError('Status code: 404');

      expect(error.code).toBe(500);
      expect(error.message).toBe('Status code: 404');
    });

    it('should handle message with malformed status code', () => {
      const error = new CrowdstrikeError('Status code: abc. Message: Invalid');

      expect(error.code).toBe(500);
      expect(error.message).toBe('Status code: abc. Message: Invalid');
    });

    it('should handle message with different status code format', () => {
      const error = new CrowdstrikeError('HTTP Status: 403. Message: Forbidden');

      expect(error.code).toBe(500);
      expect(error.message).toBe('HTTP Status: 403. Message: Forbidden');
    });
  });
});
