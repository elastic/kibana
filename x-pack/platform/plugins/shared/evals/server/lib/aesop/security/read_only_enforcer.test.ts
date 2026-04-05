/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReadOnlyEnforcer, SecurityError } from './read_only_enforcer';

describe('ReadOnlyEnforcer', () => {
  let enforcer: ReadOnlyEnforcer;

  beforeEach(() => {
    enforcer = new ReadOnlyEnforcer();
  });

  describe('validateReadOnlyRequest', () => {
    describe('Allowed operations', () => {
      it('should allow GET requests', () => {
        expect(() => enforcer.validateReadOnlyRequest('GET', '/my-index/_search')).not.toThrow();
        expect(() => enforcer.validateReadOnlyRequest('GET', '/my-index/_mapping')).not.toThrow();
        expect(() => enforcer.validateReadOnlyRequest('GET', '/_cat/indices')).not.toThrow();
      });

      it('should allow HEAD requests', () => {
        expect(() => enforcer.validateReadOnlyRequest('HEAD', '/my-index')).not.toThrow();
      });

      it('should allow POST /_search', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_search')).not.toThrow();
        expect(() => enforcer.validateReadOnlyRequest('POST', '/_search')).not.toThrow();
      });

      it('should allow POST /_count', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_count')).not.toThrow();
        expect(() => enforcer.validateReadOnlyRequest('POST', '/_count')).not.toThrow();
      });

      it('should allow POST /_field_caps', () => {
        expect(() =>
          enforcer.validateReadOnlyRequest('POST', '/my-index/_field_caps')
        ).not.toThrow();
      });

      it('should allow POST /_async_search', () => {
        expect(() =>
          enforcer.validateReadOnlyRequest('POST', '/my-index/_async_search')
        ).not.toThrow();
      });

      it('should allow POST /_msearch', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/_msearch')).not.toThrow();
      });

      it('should allow POST /_validate/query', () => {
        expect(() =>
          enforcer.validateReadOnlyRequest('POST', '/my-index/_validate/query')
        ).not.toThrow();
      });
    });

    describe('Blocked operations', () => {
      it('should block PUT requests (index creation)', () => {
        expect(() => enforcer.validateReadOnlyRequest('PUT', '/my-index')).toThrow(SecurityError);
        expect(() => enforcer.validateReadOnlyRequest('PUT', '/my-index')).toThrow(
          'PUT operations are not allowed'
        );
      });

      it('should block DELETE requests', () => {
        expect(() => enforcer.validateReadOnlyRequest('DELETE', '/my-index')).toThrow(
          SecurityError
        );
        expect(() => enforcer.validateReadOnlyRequest('DELETE', '/my-index/_doc/1')).toThrow(
          'DELETE operations are not allowed'
        );
      });

      it('should block PATCH requests', () => {
        expect(() => enforcer.validateReadOnlyRequest('PATCH', '/my-index')).toThrow(SecurityError);
      });

      it('should block POST /_create', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_create/123')).toThrow(
          SecurityError
        );
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_create/123')).toThrow(
          'write operation'
        );
      });

      it('should block POST /_update', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_update/123')).toThrow(
          SecurityError
        );
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_update/123')).toThrow(
          'write operation'
        );
      });

      it('should block POST /_delete', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_delete/123')).toThrow(
          SecurityError
        );
      });

      it('should block POST /_bulk', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/_bulk')).toThrow(SecurityError);
      });

      it('should block POST /_delete_by_query', () => {
        expect(() =>
          enforcer.validateReadOnlyRequest('POST', '/my-index/_delete_by_query')
        ).toThrow(SecurityError);
      });

      it('should block POST /_update_by_query', () => {
        expect(() =>
          enforcer.validateReadOnlyRequest('POST', '/my-index/_update_by_query')
        ).toThrow(SecurityError);
      });

      it('should block POST /_reindex', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/_reindex')).toThrow(SecurityError);
      });

      it('should block POST /_refresh', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_refresh')).toThrow(
          SecurityError
        );
      });

      it('should block document creation via POST /_doc', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_doc/123')).toThrow(
          SecurityError
        );
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_doc')).toThrow(
          SecurityError
        );
      });

      it('should block unrecognized POST paths', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_custom')).toThrow(
          SecurityError
        );
        expect(() => enforcer.validateReadOnlyRequest('POST', '/my-index/_custom')).toThrow(
          'not explicitly allowed'
        );
      });
    });

    describe('Case insensitivity', () => {
      it('should handle uppercase methods', () => {
        expect(() => enforcer.validateReadOnlyRequest('GET', '/my-index/_search')).not.toThrow();
        expect(() => enforcer.validateReadOnlyRequest('get', '/my-index/_search')).not.toThrow();
      });

      it('should handle mixed case paths', () => {
        expect(() => enforcer.validateReadOnlyRequest('POST', '/My-Index/_Search')).not.toThrow();
        expect(() => enforcer.validateReadOnlyRequest('POST', '/My-Index/_SEARCH')).not.toThrow();
      });
    });
  });

  describe('validateReadOnlyRequests (batch)', () => {
    it('should validate multiple requests', () => {
      const requests = [
        { method: 'GET', path: '/index1/_search' },
        { method: 'POST', path: '/index2/_count' },
        { method: 'GET', path: '/_cat/indices' },
      ];

      expect(() => enforcer.validateReadOnlyRequests(requests)).not.toThrow();
    });

    it('should fail on first invalid request', () => {
      const requests = [
        { method: 'GET', path: '/index1/_search' },
        { method: 'POST', path: '/index2/_delete/123' }, // Invalid
        { method: 'GET', path: '/_cat/indices' },
      ];

      expect(() => enforcer.validateReadOnlyRequests(requests)).toThrow(SecurityError);
    });
  });

  describe('wrapElasticsearchClient', () => {
    it('should wrap client methods with validation', () => {
      const mockClient = {
        search: jest.fn(),
        update: jest.fn(),
      };

      const wrappedClient = enforcer.wrapElasticsearchClient(mockClient);

      // Allowed operation
      wrappedClient.search({ method: 'POST', path: '/index/_search' });
      expect(mockClient.search).toHaveBeenCalled();

      // Blocked operation
      expect(() => wrappedClient.update({ method: 'POST', path: '/index/_update/1' })).toThrow(
        SecurityError
      );
    });

    it('should pass through non-function properties', () => {
      const mockClient = {
        config: { node: 'http://localhost:9200' },
        search: jest.fn(),
      };

      const wrappedClient = enforcer.wrapElasticsearchClient(mockClient);
      expect(wrappedClient.config).toEqual(mockClient.config);
    });
  });
});
