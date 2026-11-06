/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentBuilderErrorCode,
  CONVERSATION_COUNT_DEFAULT_GROUP_SIZE,
  CONVERSATION_COUNT_MAX_GROUP_SIZE,
} from '@kbn/agent-builder-common';
import type { ConversationCountOptions } from '@kbn/agent-builder-common';
import {
  buildCountAggregation,
  parseCountGroups,
  type ConversationCountAggregation,
} from './build_count_aggregation';

const expectBadRequest = (
  build: () => ConversationCountAggregation | undefined,
  message: RegExp
) => {
  expect(build).toThrow(
    expect.objectContaining({
      code: AgentBuilderErrorCode.badRequest,
      message: expect.stringMatching(message),
    })
  );
};

describe('buildCountAggregation', () => {
  it('returns undefined when groupBy is not set', () => {
    expect(buildCountAggregation({})).toBeUndefined();
  });

  it('builds a terms aggregation for a single registry field, mapped to its stored path', () => {
    expect(buildCountAggregation({ groupBy: 'owner' })).toEqual({
      aggs: {
        groups: { terms: { field: 'user_id', size: CONVERSATION_COUNT_DEFAULT_GROUP_SIZE } },
      },
      fields: ['owner'],
    });
  });

  it('builds a terms aggregation on a metadata key as-is, with its missing value', () => {
    expect(
      buildCountAggregation({
        groupBy: 'metadata.status',
        missing: { 'metadata.status': 'open' },
        size: 5,
      })
    ).toEqual({
      aggs: { groups: { terms: { field: 'metadata.status', missing: 'open', size: 5 } } },
      fields: ['metadata.status'],
    });
  });

  it('builds a multi_terms aggregation for 2 fields, with per-field missing values', () => {
    expect(
      buildCountAggregation({
        groupBy: ['metadata.status', 'metadata.severity'],
        missing: { 'metadata.severity': 'none' },
      })
    ).toEqual({
      aggs: {
        groups: {
          multi_terms: {
            terms: [{ field: 'metadata.status' }, { field: 'metadata.severity', missing: 'none' }],
            size: CONVERSATION_COUNT_DEFAULT_GROUP_SIZE,
          },
        },
      },
      fields: ['metadata.status', 'metadata.severity'],
    });
  });

  it('accepts a 1-element array as a single field', () => {
    expect(
      buildCountAggregation({ groupBy: ['status'] as unknown as ['status', 'owner'] })
    ).toEqual(buildCountAggregation({ groupBy: 'status' }));
  });

  it('accepts the maximum size', () => {
    expect(
      buildCountAggregation({ groupBy: 'status', size: CONVERSATION_COUNT_MAX_GROUP_SIZE })
    ).toMatchObject({
      aggs: { groups: { terms: { size: CONVERSATION_COUNT_MAX_GROUP_SIZE } } },
    });
  });

  describe('rejections', () => {
    it('rejects an unknown field, listing the allowed ones', () => {
      expectBadRequest(
        () => buildCountAggregation({ groupBy: 'space' as ConversationCountOptions['groupBy'] }),
        /Invalid group by field "space"\. Allowed fields: owner, .*metadata\.<key>/
      );
    });

    it('rejects a storage path that is not an API field', () => {
      expectBadRequest(
        () => buildCountAggregation({ groupBy: 'user_id' as ConversationCountOptions['groupBy'] }),
        /Invalid group by field "user_id"/
      );
    });

    it('rejects the nested event_type field', () => {
      expectBadRequest(
        () => buildCountAggregation({ groupBy: 'event_type' }),
        /"event_type" is not supported; it is a nested field/
      );
    });

    it.each(['created_at', 'updated_at'] as const)('rejects the date field %s', (field) => {
      expectBadRequest(
        () => buildCountAggregation({ groupBy: field }),
        new RegExp(`"${field}" is not supported; it is a date field`)
      );
    });

    it('rejects a metadata key with a wildcard', () => {
      expectBadRequest(
        () => buildCountAggregation({ groupBy: 'metadata.sta*' }),
        /Invalid group by field "metadata\.sta\*"/
      );
    });

    it('rejects an empty metadata key', () => {
      expectBadRequest(
        () => buildCountAggregation({ groupBy: 'metadata.' }),
        /Invalid group by field "metadata\."/
      );
    });

    it('rejects the same field twice', () => {
      expectBadRequest(
        () => buildCountAggregation({ groupBy: ['status', 'status'] }),
        /must be distinct/
      );
    });

    it('rejects more than 2 fields', () => {
      expectBadRequest(
        () =>
          buildCountAggregation({
            groupBy: ['status', 'owner', 'agent_id'] as unknown as ['status', 'owner'],
          }),
        /1 or 2 fields/
      );
    });

    it('rejects an empty field list', () => {
      expectBadRequest(
        () => buildCountAggregation({ groupBy: [] as unknown as ['status', 'owner'] }),
        /1 or 2 fields/
      );
    });

    it('rejects a missing value for a field that is not grouped by', () => {
      expectBadRequest(
        () => buildCountAggregation({ groupBy: 'status', missing: { owner: 'nobody' } }),
        /Missing value for "owner" does not apply/
      );
    });

    it('rejects a non-string missing value', () => {
      expectBadRequest(
        () =>
          buildCountAggregation({
            groupBy: 'status',
            missing: { status: 1 as unknown as string },
          }),
        /Missing value for "status" must be a string/
      );
    });

    it.each([0, -1, 1.5, CONVERSATION_COUNT_MAX_GROUP_SIZE + 1, Number.NaN])(
      'rejects size %p',
      (size) => {
        expectBadRequest(
          () => buildCountAggregation({ groupBy: 'status', size }),
          new RegExp(`between 1 and ${CONVERSATION_COUNT_MAX_GROUP_SIZE}`)
        );
      }
    );

    it('rejects an out-of-bounds size even without groupBy', () => {
      expectBadRequest(
        () => buildCountAggregation({ size: CONVERSATION_COUNT_MAX_GROUP_SIZE + 1 }),
        new RegExp(`between 1 and ${CONVERSATION_COUNT_MAX_GROUP_SIZE}`)
      );
    });
  });
});

describe('parseCountGroups', () => {
  it('returns no groups when the response has no aggregations', () => {
    expect(parseCountGroups(undefined, ['status'])).toEqual([]);
  });

  it('keys terms buckets by the caller field name, in response order', () => {
    expect(
      parseCountGroups(
        {
          groups: {
            buckets: [
              { key: 'open', doc_count: 6 },
              { key: 'closed', doc_count: 2 },
            ],
          },
        },
        ['metadata.status']
      )
    ).toEqual([
      { key: { 'metadata.status': 'open' }, count: 6 },
      { key: { 'metadata.status': 'closed' }, count: 2 },
    ]);
  });

  it('spreads multi_terms bucket keys across the caller field names', () => {
    expect(
      parseCountGroups(
        {
          groups: {
            buckets: [
              { key: ['open', 'high'], key_as_string: 'open|high', doc_count: 6 },
              { key: ['open', 'none'], key_as_string: 'open|none', doc_count: 1 },
            ],
          },
        },
        ['metadata.status', 'metadata.severity']
      )
    ).toEqual([
      { key: { 'metadata.status': 'open', 'metadata.severity': 'high' }, count: 6 },
      { key: { 'metadata.status': 'open', 'metadata.severity': 'none' }, count: 1 },
    ]);
  });

  it('stringifies non-string bucket keys', () => {
    expect(
      parseCountGroups({ groups: { buckets: [{ key: 3, doc_count: 1 }] } }, ['metadata.priority'])
    ).toEqual([{ key: { 'metadata.priority': '3' }, count: 1 }]);
  });
});
