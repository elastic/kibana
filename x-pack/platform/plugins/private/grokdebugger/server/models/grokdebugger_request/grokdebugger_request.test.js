/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GrokdebuggerRequest } from './grokdebugger_request';

// FAILING: https://github.com/elastic/kibana/issues/51372
describe.skip('grokdebugger_request', () => {
  describe('GrokdebuggerRequest', () => {
    const downstreamRequest = {
      rawEvent: '55.3.244.1 GET /index.html',
      pattern: '%{IP:client} %{WORD:method} %{URIPATHPARAM:request}',
    };

    const downstreamRequestWithCustomPatterns = {
      rawEvent: '55.3.244.1 GET /index.html',
      pattern: '%{IP:client} %{WORD:method} %{URIPATHPARAM:request}',
      customPatterns: '%{FOO:bar}',
    };

    describe('fromDownstreamJSON factory method', () => {
      it('returns correct GrokdebuggerRequest instance from downstreamRequest', () => {
        const grokdebuggerRequest = GrokdebuggerRequest.fromDownstreamJSON(downstreamRequest);
        expect(grokdebuggerRequest.rawEvent).toEqual(downstreamRequest.rawEvent);
        expect(grokdebuggerRequest.pattern).toEqual(downstreamRequest.pattern);
        expect(grokdebuggerRequest.customPatterns).toEqual({});
      });

      it('returns correct GrokdebuggerRequest instance from downstreamRequest when custom patterns are specified', () => {
        const grokdebuggerRequest = GrokdebuggerRequest.fromDownstreamJSON(
          downstreamRequestWithCustomPatterns
        );
        expect(grokdebuggerRequest.rawEvent).toEqual(downstreamRequest.rawEvent);
        expect(grokdebuggerRequest.pattern).toEqual(downstreamRequest.pattern);
        expect(grokdebuggerRequest.customPatterns).toEqual('%{FOO:bar}');
      });
    });

    describe('upstreamJSON getter method', () => {
      it('returns the upstream simulate JSON request', () => {
        const expectedUpstreamJSON = {
          pipeline: {
            description: 'this is a grokdebugger simulation',
            processors: [
              {
                grok: {
                  field: 'rawEvent',
                  patterns: ['%{IP:client} %{WORD:method} %{URIPATHPARAM:request}'],
                  pattern_definitions: {},
                },
              },
            ],
          },
          docs: [
            {
              _index: 'grokdebugger',
              _type: 'grokdebugger',
              _id: 'grokdebugger',
              _source: {
                rawEvent: '55.3.244.1 GET /index.html',
              },
            },
          ],
        };
        const grokdebuggerRequest = GrokdebuggerRequest.fromDownstreamJSON(downstreamRequest);
        const upstreamJson = grokdebuggerRequest.upstreamJSON;
        expect(upstreamJson).toEqual(expectedUpstreamJSON);
      });

      it('returns the upstream simulate JSON request when custom patterns are specified', () => {
        const expectedUpstreamJSON = {
          pipeline: {
            description: 'this is a grokdebugger simulation',
            processors: [
              {
                grok: {
                  field: 'rawEvent',
                  patterns: ['%{IP:client} %{WORD:method} %{URIPATHPARAM:request}'],
                  pattern_definitions: '%{FOO:bar}',
                },
              },
            ],
          },
          docs: [
            {
              _index: 'grokdebugger',
              _type: 'grokdebugger',
              _id: 'grokdebugger',
              _source: {
                rawEvent: '55.3.244.1 GET /index.html',
              },
            },
          ],
        };
        const grokdebuggerRequest = GrokdebuggerRequest.fromDownstreamJSON(
          downstreamRequestWithCustomPatterns
        );
        const upstreamJson = grokdebuggerRequest.upstreamJSON;
        expect(upstreamJson).toEqual(expectedUpstreamJSON);
      });
    });
  });
});
