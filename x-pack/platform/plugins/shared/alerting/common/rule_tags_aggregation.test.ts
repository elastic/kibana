/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleTagsAggregation, formatRuleTagsAggregationResult } from './rule_tags_aggregation';

describe('getRuleTagsAggregation', () => {
  it('should return aggregation with default params', () => {
    const result = getRuleTagsAggregation();
    expect(result.tags).toEqual({
      composite: {
        size: 50,
        sources: [
          {
            tags: {
              terms: {
                field: 'alert.attributes.tags',
                order: 'asc',
              },
            },
          },
        ],
      },
    });
  });

  it('should return aggregation with custom maxTags', () => {
    const result = getRuleTagsAggregation({
      maxTags: 100,
      after: {
        tags: 'e',
      },
    });
    expect(result.tags).toEqual({
      composite: {
        size: 100,
        after: {
          tags: 'e',
        },
        sources: [
          {
            tags: {
              terms: {
                field: 'alert.attributes.tags',
                order: 'asc',
              },
            },
          },
        ],
      },
    });
  });
});

describe('formatRuleTagsAggregationResult', () => {
  it('should format aggregation result', () => {
    const result = formatRuleTagsAggregationResult({
      tags: {
        buckets: [
          {
            key: {
              tags: 'a',
            },
            doc_count: 1,
          },
          {
            key: {
              tags: 'b',
            },
            doc_count: 2,
          },
          {
            key: {
              tags: 'c',
            },
            doc_count: 3,
          },
          {
            key: {
              tags: 'd',
            },
            doc_count: 4,
          },
        ],
      },
    });

    expect(result.ruleTags).toEqual(['a', 'b', 'c', 'd']);
  });
});
