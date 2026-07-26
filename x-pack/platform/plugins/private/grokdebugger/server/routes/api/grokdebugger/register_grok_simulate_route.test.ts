/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GrokdebuggerRequest } from '../../../models/grokdebugger_request';
import { requestBodySchema } from './register_grok_simulate_route';

const validBody = {
  rawEvent: '55.3.244.1 GET /index.html',
  pattern: '%{IP:client} %{WORD:method} %{URIPATHPARAM:request}',
  customPatterns: { POSTFIX_QUEUEID: '[0-9A-F]{10,11}' },
};

describe('grok simulate route', () => {
  describe('requestBodySchema', () => {
    describe('WHEN customPatterns is an empty object', () => {
      it('SHOULD accept the payload', () => {
        const result = requestBodySchema.validate({ ...validBody, customPatterns: {} });
        expect(result.customPatterns).toEqual({});
      });
    });

    it.each([
      ['number', { FOO: 123 }],
      ['null', { FOO: null }],
      ['boolean', { FOO: true }],
      ['nested object', { FOO: { nested: true } }],
      ['array', { FOO: ['a'] }],
    ])('SHOULD reject customPatterns with a %s value', (_label, customPatterns) => {
      expect(() => requestBodySchema.validate({ ...validBody, customPatterns })).toThrowError(
        /expected value of type \[string\]/
      );
    });
  });

  describe('requestBodySchema → fromDownstreamJSON round-trip', () => {
    it('SHOULD produce a valid GrokdebuggerRequest with customPatterns', () => {
      const validated = requestBodySchema.validate(validBody);
      const req = GrokdebuggerRequest.fromDownstreamJSON(validated);
      expect(req.customPatterns).toEqual({ POSTFIX_QUEUEID: '[0-9A-F]{10,11}' });
      expect(req.upstreamJSON.pipeline.processors[0].grok.pattern_definitions).toEqual({
        POSTFIX_QUEUEID: '[0-9A-F]{10,11}',
      });
    });

    it('SHOULD produce a valid GrokdebuggerRequest when customPatterns is omitted', () => {
      const { customPatterns, ...bodyWithout } = validBody;
      const validated = requestBodySchema.validate(bodyWithout);
      const req = GrokdebuggerRequest.fromDownstreamJSON(validated);
      expect(req.customPatterns).toEqual({});
      expect(req.upstreamJSON.pipeline.processors[0].grok.pattern_definitions).toEqual({});
    });
  });
});
