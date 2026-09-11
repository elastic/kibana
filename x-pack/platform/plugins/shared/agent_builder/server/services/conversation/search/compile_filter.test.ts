/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import { AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import {
  CONVERSATION_SEARCH_FILTER_MAX_LENGTH,
  CONVERSATION_SEARCH_FILTER_MAX_NODES,
} from '../../../../common/constants';
import { compileConversationFilter } from './compile_filter';

describe('compileConversationFilter', () => {
  describe('empty filters', () => {
    it.each([undefined, '', '   '])('returns undefined for %p', (filter) => {
      expect(compileConversationFilter(filter)).toBeUndefined();
    });
  });

  describe('pre-built AST filters', () => {
    it('compiles a nodeBuilder clause identically to its KQL equivalent', () => {
      expect(compileConversationFilter(nodeBuilder.is('status', 'completed'))).toEqual(
        compileConversationFilter('status: completed')
      );
    });

    it('compiles a nodeBuilder boolean combination identically to its KQL equivalent', () => {
      const composed = nodeBuilder.and([
        nodeBuilder.is('template_id', 'alert_triage'),
        nodeBuilder.or([
          nodeBuilder.is('attachment_type', 'alert'),
          nodeBuilder.is('attachment_type', 'dashboard'),
        ]),
      ]);

      expect(compileConversationFilter(composed)).toEqual(
        compileConversationFilter(
          'template_id: alert_triage and (attachment_type: alert or attachment_type: dashboard)'
        )
      );
    });

    it('wraps a nested registry field even when the caller built the node directly', () => {
      expect(compileConversationFilter(nodeBuilder.is('event_type', 'user_message'))).toEqual({
        nested: expect.objectContaining({ path: 'events' }),
      });
    });

    it('applies field validation to a pre-built node', () => {
      expect(() => compileConversationFilter(nodeBuilder.is('user_id', 'user-1'))).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringContaining('Invalid filter field "user_id"'),
        })
      );
    });

    it('rejects a bare literal node, which has no field to validate', () => {
      expect(() => compileConversationFilter(nodeTypes.literal.buildNode('anything'))).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringContaining('Unsupported expression in filter'),
        })
      );
    });
  });

  describe('keyword fields', () => {
    it('compiles owner to a term query on the stored user_id', () => {
      expect(compileConversationFilter('owner: "user-1"')).toEqual({
        bool: {
          should: [{ term: { user_id: { value: 'user-1' } } }],
          minimum_should_match: 1,
        },
      });
    });

    it.each([
      ['agent_id: agent-1', 'agent_id', 'agent-1'],
      ['template_id: alert_triage', 'template_id', 'alert_triage'],
      ['attachment_type: alert', 'attachments.type', 'alert'],
      ['attachment_id: att-1', 'attachments.id', 'att-1'],
      ['status: completed', 'status', 'completed'],
    ])('compiles %s onto %s', (filter, esField, value) => {
      expect(compileConversationFilter(filter)).toEqual({
        bool: {
          should: [{ term: { [esField]: { value } } }],
          minimum_should_match: 1,
        },
      });
    });

    it('compiles a wildcard value into a wildcard query', () => {
      expect(compileConversationFilter('template_id: alert*')).toEqual({
        bool: {
          should: [{ wildcard: { template_id: { value: 'alert*' } } }],
          minimum_should_match: 1,
        },
      });
    });

    it('compiles a lone wildcard value into an exists query', () => {
      expect(compileConversationFilter('template_id: *')).toEqual({
        bool: {
          should: [{ exists: { field: 'template_id' } }],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('nested event fields', () => {
    it('wraps event_type in a nested query on the events path', () => {
      expect(compileConversationFilter('event_type: user_message')).toEqual({
        nested: {
          path: 'events',
          score_mode: 'none',
          ignore_unmapped: true,
          query: {
            bool: {
              should: [{ term: { 'events.type': { value: 'user_message' } } }],
              minimum_should_match: 1,
            },
          },
        },
      });
    });

    it('negates event_type as "has no such event"', () => {
      expect(compileConversationFilter('NOT event_type: user_message')).toEqual({
        bool: {
          must_not: {
            nested: expect.objectContaining({ path: 'events' }),
          },
        },
      });
    });
  });

  describe('date fields', () => {
    it('compiles a range comparison', () => {
      expect(compileConversationFilter('updated_at >= "2026-01-01"')).toEqual({
        bool: {
          should: [{ range: { updated_at: { gte: '2026-01-01' } } }],
          minimum_should_match: 1,
        },
      });
    });

    it('compiles an exact date match as a bounded range', () => {
      expect(compileConversationFilter('created_at: "2026-01-01"')).toEqual({
        bool: {
          should: [{ range: { created_at: { gte: '2026-01-01', lte: '2026-01-01' } } }],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('metadata fields', () => {
    it('compiles a metadata key to a term query with keyword semantics', () => {
      expect(compileConversationFilter('metadata.severity: high')).toEqual({
        bool: {
          should: [{ term: { 'metadata.severity': { value: 'high' } } }],
          minimum_should_match: 1,
        },
      });
    });

    it('supports several metadata keys in one filter', () => {
      expect(
        compileConversationFilter('metadata.severity: high and metadata.team: search')
      ).toEqual({
        bool: {
          filter: [
            {
              bool: {
                should: [{ term: { 'metadata.severity': { value: 'high' } } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [{ term: { 'metadata.team': { value: 'search' } } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      });
    });

    it('rejects a range comparison, since metadata values are stored as strings', () => {
      expect(() => compileConversationFilter('metadata.count > 5')).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringContaining('does not support range comparisons'),
        })
      );
    });

    it('rejects a bare metadata reference with no key', () => {
      expect(() => compileConversationFilter('metadata: high')).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringContaining('Invalid filter field "metadata"'),
        })
      );
    });

    it('rejects a metadata key beyond the stored key length', () => {
      const key = 'k'.repeat(257);

      expect(() => compileConversationFilter(`metadata.${key}: high`)).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringContaining('Invalid filter field'),
        })
      );
    });
  });

  describe('boolean composition', () => {
    it('compiles AND into a bool filter', () => {
      expect(compileConversationFilter('status: completed and agent_id: agent-1')).toEqual({
        bool: {
          filter: [
            {
              bool: {
                should: [{ term: { status: { value: 'completed' } } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [{ term: { agent_id: { value: 'agent-1' } } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      });
    });

    it('compiles OR into a bool should', () => {
      expect(compileConversationFilter('status: completed or status: error')).toEqual({
        bool: {
          should: [
            {
              bool: {
                should: [{ term: { status: { value: 'completed' } } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [{ term: { status: { value: 'error' } } }],
                minimum_should_match: 1,
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    });

    it('compiles a mix of grouping, negation and nesting', () => {
      const compiled = compileConversationFilter(
        '(event_type: user_message or attachment_type: alert) and not owner: "elastic"'
      );

      expect(compiled).toEqual({
        bool: {
          filter: [
            {
              bool: {
                should: [
                  { nested: expect.objectContaining({ path: 'events' }) },
                  {
                    bool: {
                      should: [{ term: { 'attachments.type': { value: 'alert' } } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                must_not: {
                  bool: {
                    should: [{ term: { user_id: { value: 'elastic' } } }],
                    minimum_should_match: 1,
                  },
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('rejections', () => {
    it('rejects an unknown field and lists the allowed ones', () => {
      expect(() => compileConversationFilter('user_id: "user-1"')).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringMatching(
            /^Invalid filter field "user_id"\. Allowed fields: owner, .*metadata\.<key>$/
          ),
        })
      );
    });

    it.each([
      'title: hello',
      'space: default',
      'pinned: true',
      'access_control.access_mode: public',
    ])('rejects the non-filterable field in %p', (filter) => {
      expect(() => compileConversationFilter(filter)).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringContaining('Invalid filter field'),
        })
      );
    });

    it('rejects a wildcard field name, which would bypass field validation', () => {
      expect(() => compileConversationFilter('*: alert')).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringContaining('wildcards are not supported'),
        })
      );
    });

    it('rejects a caller-written nested group, which depends on storage layout', () => {
      expect(() => compileConversationFilter('events: { type: user_message }')).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringContaining('Unsupported expression "nested"'),
        })
      );
    });

    it('rejects malformed KQL', () => {
      expect(() => compileConversationFilter('owner: (')).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringContaining('Invalid filter'),
        })
      );
    });

    it('rejects a filter past the length limit', () => {
      const filter = `owner: "${'a'.repeat(CONVERSATION_SEARCH_FILTER_MAX_LENGTH)}"`;

      expect(() => compileConversationFilter(filter)).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringContaining(
            `maximum length of ${CONVERSATION_SEARCH_FILTER_MAX_LENGTH}`
          ),
        })
      );
    });

    it('rejects a filter with too many expressions', () => {
      const filter = Array.from(
        { length: CONVERSATION_SEARCH_FILTER_MAX_NODES },
        (_unused, index) => `status: s${index}`
      ).join(' or ');

      expect(filter.length).toBeLessThanOrEqual(CONVERSATION_SEARCH_FILTER_MAX_LENGTH);
      expect(() => compileConversationFilter(filter)).toThrow(
        expect.objectContaining({
          code: AgentBuilderErrorCode.badRequest,
          message: expect.stringContaining('too complex'),
        })
      );
    });
  });
});
