/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseStreamFromEsqlQuery,
  detectStreamContext,
  createContentPopoverUrl,
} from './stream_context_detection';

describe('stream_context_detection', () => {
  describe('parseStreamFromEsqlQuery', () => {
    describe('basic FROM queries', () => {
      it('parses simple FROM clause', () => {
        expect(parseStreamFromEsqlQuery('FROM logs')).toBe('logs');
      });

      it('parses FROM clause with dotted stream name', () => {
        expect(parseStreamFromEsqlQuery('FROM logs.abc')).toBe('logs.abc');
      });

      it('parses FROM clause with deeply nested stream name', () => {
        expect(parseStreamFromEsqlQuery('FROM logs.system.syslog')).toBe('logs.system.syslog');
      });

      it('parses FROM clause with hyphenated stream name', () => {
        expect(parseStreamFromEsqlQuery('FROM my-logs-stream')).toBe('my-logs-stream');
      });

      it('parses FROM clause with underscored stream name', () => {
        expect(parseStreamFromEsqlQuery('FROM my_logs_stream')).toBe('my_logs_stream');
      });

      it('parses FROM clause starting with underscore', () => {
        expect(parseStreamFromEsqlQuery('FROM _internal_logs')).toBe('_internal_logs');
      });
    });

    describe('FROM queries with pipes and additional clauses', () => {
      it('extracts stream name before LIMIT clause', () => {
        expect(parseStreamFromEsqlQuery('FROM logs | LIMIT 10')).toBe('logs');
      });

      it('extracts stream name before WHERE clause', () => {
        expect(parseStreamFromEsqlQuery('FROM logs.abc | WHERE level = "error"')).toBe('logs.abc');
      });

      it('extracts stream name before complex pipeline', () => {
        expect(
          parseStreamFromEsqlQuery(
            'FROM metrics.system | WHERE host.name = "server1" | STATS avg(cpu) BY @timestamp'
          )
        ).toBe('metrics.system');
      });
    });

    describe('FROM queries with wildcards', () => {
      it('removes trailing wildcard from stream name', () => {
        expect(parseStreamFromEsqlQuery('FROM logs.*')).toBe('logs');
      });

      it('handles comma-separated sources with wildcard', () => {
        expect(parseStreamFromEsqlQuery('FROM logs,logs.*')).toBe('logs');
      });

      it('handles dotted stream with wildcard suffix', () => {
        expect(parseStreamFromEsqlQuery('FROM logs.abc,logs.abc.*')).toBe('logs.abc');
      });
    });

    describe('FROM queries with METADATA', () => {
      it('extracts stream name ignoring METADATA clause', () => {
        expect(parseStreamFromEsqlQuery('FROM logs METADATA _source')).toBe('logs');
      });

      it('extracts stream name ignoring METADATA with multiple fields', () => {
        expect(parseStreamFromEsqlQuery('FROM logs.abc METADATA _source, _id')).toBe('logs.abc');
      });
    });

    describe('TS (time series) queries', () => {
      it('parses simple TS clause', () => {
        expect(parseStreamFromEsqlQuery('TS metrics')).toBe('metrics');
      });

      it('parses TS clause with dotted stream name', () => {
        expect(parseStreamFromEsqlQuery('TS metrics.system')).toBe('metrics.system');
      });

      it('parses TS clause with wildcard', () => {
        expect(parseStreamFromEsqlQuery('TS metrics.*')).toBe('metrics');
      });

      it('parses TS clause with additional clauses', () => {
        expect(parseStreamFromEsqlQuery('TS metrics.cpu | STATS avg(usage) BY @timestamp')).toBe(
          'metrics.cpu'
        );
      });
    });

    describe('case insensitivity', () => {
      it('handles lowercase FROM', () => {
        expect(parseStreamFromEsqlQuery('from logs')).toBe('logs');
      });

      it('handles mixed case FROM', () => {
        expect(parseStreamFromEsqlQuery('From logs')).toBe('logs');
      });

      it('handles lowercase TS', () => {
        expect(parseStreamFromEsqlQuery('ts metrics')).toBe('metrics');
      });
    });

    describe('whitespace handling', () => {
      it('handles leading whitespace', () => {
        expect(parseStreamFromEsqlQuery('  FROM logs')).toBe('logs');
      });

      it('handles multiple spaces after FROM', () => {
        expect(parseStreamFromEsqlQuery('FROM   logs')).toBe('logs');
      });

      it('handles tabs and newlines', () => {
        expect(parseStreamFromEsqlQuery('FROM\tlogs')).toBe('logs');
        expect(parseStreamFromEsqlQuery('FROM\nlogs')).toBe('logs');
      });
    });

    describe('edge cases and invalid inputs', () => {
      it('returns undefined for empty string', () => {
        expect(parseStreamFromEsqlQuery('')).toBeUndefined();
      });

      it('returns undefined for null-ish values', () => {
        expect(parseStreamFromEsqlQuery(undefined as unknown as string)).toBeUndefined();
        expect(parseStreamFromEsqlQuery(null as unknown as string)).toBeUndefined();
      });

      it('returns undefined for query without FROM', () => {
        expect(parseStreamFromEsqlQuery('SHOW FUNCTIONS')).toBeUndefined();
      });

      it('returns undefined for query with only FROM keyword', () => {
        expect(parseStreamFromEsqlQuery('FROM')).toBeUndefined();
      });

      it('returns undefined for source starting with number', () => {
        expect(parseStreamFromEsqlQuery('FROM 123logs')).toBeUndefined();
      });

      it('returns undefined for source starting with special char', () => {
        expect(parseStreamFromEsqlQuery('FROM @logs')).toBeUndefined();
      });

      it('handles query with FROM in middle (not at start)', () => {
        // FROM must be at the start of the query
        expect(parseStreamFromEsqlQuery('SELECT * FROM logs')).toBeUndefined();
      });
    });
  });

  describe('detectStreamContext', () => {
    const mockBasePath = {
      prepend: (path: string) => `/base${path}`,
    };

    describe('URL parameter detection', () => {
      it('detects stream from ?stream parameter', () => {
        const result = detectStreamContext(
          { pathname: '/app/any', search: '?stream=logs.abc', hash: '' },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'logs.abc', source: 'url_param' });
      });

      it('detects stream from ?streamName parameter', () => {
        const result = detectStreamContext(
          { pathname: '/app/any', search: '?streamName=metrics.system', hash: '' },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'metrics.system', source: 'url_param' });
      });

      it('prioritizes stream parameter over other context sources', () => {
        // Even when in Discover with an ES|QL query, URL param takes precedence
        const result = detectStreamContext(
          {
            pathname: '/base/app/discover',
            search: '?stream=override-stream',
            hash: "#_a=(query:(esql:'FROM logs'))",
          },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'override-stream', source: 'url_param' });
      });
    });

    describe('Discover ES|QL query detection', () => {
      it('detects stream from Discover URL with ES|QL query in _a state', () => {
        // Rison-encoded: (query:(esql:'FROM logs.abc'))
        const hash = "#_a=(query:(esql:'FROM%20logs.abc'))";
        const result = detectStreamContext(
          { pathname: '/base/app/discover', search: '', hash },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'logs.abc', source: 'esql_query' });
      });

      it('detects stream from Discover URL with complex ES|QL query', () => {
        // Rison-encoded query with pipes
        const hash = "#_a=(query:(esql:'FROM%20metrics.system%20%7C%20LIMIT%2010'))";
        const result = detectStreamContext(
          { pathname: '/base/app/discover', search: '', hash },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'metrics.system', source: 'esql_query' });
      });

      it('handles Discover path without base path prefix', () => {
        const hash = "#_a=(query:(esql:'FROM%20logs'))";
        const result = detectStreamContext(
          { pathname: '/app/discover', search: '', hash },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'logs', source: 'esql_query' });
      });

      it('returns none when Discover has no ES|QL query', () => {
        const result = detectStreamContext(
          { pathname: '/base/app/discover', search: '', hash: '#_a=(query:(query:"test"))' },
          mockBasePath
        );
        expect(result).toEqual({ streamName: undefined, source: 'none' });
      });

      it('returns none when hash is empty in Discover', () => {
        const result = detectStreamContext(
          { pathname: '/base/app/discover', search: '', hash: '' },
          mockBasePath
        );
        expect(result).toEqual({ streamName: undefined, source: 'none' });
      });
    });

    describe('Streams app path detection', () => {
      it('detects stream from streams app URL path', () => {
        const result = detectStreamContext(
          { pathname: '/base/app/streams/logs.abc/overview', search: '', hash: '' },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'logs.abc', source: 'streams_app' });
      });

      it('decodes URL-encoded stream names', () => {
        const result = detectStreamContext(
          { pathname: '/base/app/streams/logs%2Esystem/management', search: '', hash: '' },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'logs.system', source: 'streams_app' });
      });

      it('handles streams app path without base path prefix', () => {
        const result = detectStreamContext(
          { pathname: '/app/streams/metrics', search: '', hash: '' },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'metrics', source: 'streams_app' });
      });

      it('ignores _discovery path in streams app', () => {
        const result = detectStreamContext(
          { pathname: '/base/app/streams/_discovery', search: '', hash: '' },
          mockBasePath
        );
        expect(result).toEqual({ streamName: undefined, source: 'none' });
      });

      it('extracts stream name from deep paths', () => {
        const result = detectStreamContext(
          { pathname: '/base/app/streams/logs.web/management/schema', search: '', hash: '' },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'logs.web', source: 'streams_app' });
      });
    });

    describe('no context detection', () => {
      it('returns none for unrecognized app paths', () => {
        const result = detectStreamContext(
          { pathname: '/app/dashboards', search: '', hash: '' },
          mockBasePath
        );
        expect(result).toEqual({ streamName: undefined, source: 'none' });
      });

      it('returns none for root path', () => {
        const result = detectStreamContext({ pathname: '/', search: '', hash: '' }, mockBasePath);
        expect(result).toEqual({ streamName: undefined, source: 'none' });
      });

      it('returns none for streams app root without stream name', () => {
        const result = detectStreamContext(
          { pathname: '/base/app/streams', search: '', hash: '' },
          mockBasePath
        );
        expect(result).toEqual({ streamName: undefined, source: 'none' });
      });
    });

    describe('priority order', () => {
      it('URL param has highest priority', () => {
        // All three sources present: URL param should win
        const result = detectStreamContext(
          {
            pathname: '/base/app/streams/path-stream',
            search: '?stream=param-stream',
            hash: "#_a=(query:(esql:'FROM%20esql-stream'))",
          },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'param-stream', source: 'url_param' });
      });

      it('ES|QL query has priority over streams app path when not in streams app', () => {
        // When in Discover (not streams app), ES|QL should be checked
        const hash = "#_a=(query:(esql:'FROM%20logs.esql'))";
        const result = detectStreamContext(
          { pathname: '/base/app/discover', search: '', hash },
          mockBasePath
        );
        expect(result).toEqual({ streamName: 'logs.esql', source: 'esql_query' });
      });
    });
  });

  describe('createContentPopoverUrl', () => {
    const mockBasePath = {
      prepend: (path: string) => `/base${path}`,
    };

    it('creates URL with stream parameter', () => {
      const url = createContentPopoverUrl('logs.abc', mockBasePath);
      expect(url).toBe('/base/app/streams/_content?stream=logs.abc');
    });

    it('creates URL with stream and returnTo parameters', () => {
      const url = createContentPopoverUrl('logs.abc', mockBasePath, '/app/discover');
      expect(url).toBe('/base/app/streams/_content?stream=logs.abc&returnTo=%2Fapp%2Fdiscover');
    });

    it('encodes special characters in stream name', () => {
      const url = createContentPopoverUrl('logs.system&test', mockBasePath);
      expect(url).toBe('/base/app/streams/_content?stream=logs.system%26test');
    });

    it('encodes special characters in returnTo path', () => {
      const url = createContentPopoverUrl('logs', mockBasePath, '/app/discover?query=test&foo=bar');
      expect(url).toContain('returnTo=');
      // URL should be properly encoded
      expect(url).toContain('%2Fapp%2Fdiscover');
    });

    it('omits returnTo when not provided', () => {
      const url = createContentPopoverUrl('metrics', mockBasePath);
      expect(url).not.toContain('returnTo');
    });

    it('omits returnTo when empty string', () => {
      const url = createContentPopoverUrl('metrics', mockBasePath, '');
      expect(url).not.toContain('returnTo');
    });
  });
});
