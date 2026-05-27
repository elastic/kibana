/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateFilterListsUsage, emptyFilterListsUsage } from './filter_lists_usage_aggregation';

describe('emptyFilterListsUsage', () => {
  it('returns all zeroes', () => {
    expect(emptyFilterListsUsage()).toEqual({
      total_filter_list_count: 0,
      total_filter_item_count: 0,
      avg_items_per_filter_list: 0,
      empty_filter_list_count: 0,
      filter_lists_used_in_rules_count: 0,
    });
  });
});

describe('aggregateFilterListsUsage', () => {
  it('returns zeroes for empty filters and jobs arrays', () => {
    expect(aggregateFilterListsUsage([], [])).toEqual(emptyFilterListsUsage());
  });

  it('counts total filter lists and total items', () => {
    const filters = [
      { filter_id: 'f1', items: ['a', 'b', 'c'] },
      { filter_id: 'f2', items: ['x', 'y'] },
    ];
    const result = aggregateFilterListsUsage(filters, []);
    expect(result.total_filter_list_count).toBe(2);
    expect(result.total_filter_item_count).toBe(5);
  });

  it('computes avg_items_per_filter_list rounded to 2 decimal places', () => {
    const filters = [
      { filter_id: 'f1', items: ['a'] },
      { filter_id: 'f2', items: ['b', 'c'] },
      { filter_id: 'f3', items: ['d', 'e', 'f'] },
    ];
    // avg = 6 / 3 = 2.0
    expect(aggregateFilterListsUsage(filters, []).avg_items_per_filter_list).toBe(2);
  });

  it('rounds avg_items_per_filter_list to 2 decimal places', () => {
    // 10 items across 3 lists = 3.333...
    const filters = [
      { filter_id: 'f1', items: ['a', 'b', 'c', 'd'] },
      { filter_id: 'f2', items: ['e', 'f', 'g', 'h'] },
      { filter_id: 'f3', items: ['i', 'j'] },
    ];
    expect(aggregateFilterListsUsage(filters, []).avg_items_per_filter_list).toBe(3.33);
  });

  it('returns avg 0 when there are no filter lists', () => {
    expect(aggregateFilterListsUsage([], []).avg_items_per_filter_list).toBe(0);
  });

  it('counts empty filter lists', () => {
    const filters = [
      { filter_id: 'f1', items: [] },
      { filter_id: 'f2', items: ['a'] },
      { filter_id: 'f3', items: [] },
    ];
    expect(aggregateFilterListsUsage(filters, []).empty_filter_list_count).toBe(2);
  });

  it('counts filter lists referenced in job rule scopes', () => {
    const filters = [
      { filter_id: 'safe_domains', items: ['example.com'] },
      { filter_id: 'trusted_users', items: ['alice', 'bob'] },
      { filter_id: 'unused_list', items: ['x'] },
    ];
    const jobs = [
      {
        analysis_config: {
          detectors: [
            {
              custom_rules: [
                {
                  scope: {
                    domain: { filter_id: 'safe_domains' },
                    user: { filter_id: 'trusted_users' },
                  },
                },
              ],
            },
          ],
        },
      },
    ];
    const result = aggregateFilterListsUsage(filters, jobs);
    expect(result.filter_lists_used_in_rules_count).toBe(2);
  });

  it('does not count the same filter list more than once even if referenced across multiple rules/jobs', () => {
    const filters = [{ filter_id: 'f1', items: ['a'] }];
    const jobs = [
      {
        analysis_config: {
          detectors: [
            {
              custom_rules: [
                { scope: { field: { filter_id: 'f1' } } },
                { scope: { other: { filter_id: 'f1' } } },
              ],
            },
          ],
        },
      },
      {
        analysis_config: {
          detectors: [{ custom_rules: [{ scope: { field: { filter_id: 'f1' } } }] }],
        },
      },
    ];
    expect(aggregateFilterListsUsage(filters, jobs).filter_lists_used_in_rules_count).toBe(1);
  });

  it('excludes filter IDs referenced in rules that do not match any known filter list', () => {
    const filters = [{ filter_id: 'f1', items: ['a'] }];
    const jobs = [
      {
        analysis_config: {
          detectors: [
            {
              custom_rules: [
                {
                  scope: {
                    field: { filter_id: 'deleted_or_unknown' },
                  },
                },
              ],
            },
          ],
        },
      },
    ];
    expect(aggregateFilterListsUsage(filters, jobs).filter_lists_used_in_rules_count).toBe(0);
  });

  it('handles jobs with no analysis_config or detectors', () => {
    const filters = [{ filter_id: 'f1', items: ['a'] }];
    const jobs = [{ analysis_config: { detectors: [] } }, {}];
    expect(aggregateFilterListsUsage(filters, jobs).filter_lists_used_in_rules_count).toBe(0);
  });

  it('handles rules with no scope', () => {
    const filters = [{ filter_id: 'f1', items: ['a'] }];
    const jobs = [
      {
        analysis_config: {
          detectors: [{ custom_rules: [{ scope: undefined }] }],
        },
      },
    ];
    expect(aggregateFilterListsUsage(filters, jobs).filter_lists_used_in_rules_count).toBe(0);
  });

  it('aggregates a realistic mixed scenario correctly', () => {
    const filters = [
      { filter_id: 'safe_domains', items: ['example.com', 'safe.org'] },
      { filter_id: 'trusted_users', items: ['alice', 'bob', 'carol'] },
      { filter_id: 'empty_list', items: [] },
      { filter_id: 'orphaned_list', items: ['x', 'y', 'z'] },
    ];
    const jobs = [
      {
        analysis_config: {
          detectors: [
            {
              custom_rules: [
                {
                  scope: {
                    domain: { filter_id: 'safe_domains' },
                    user: { filter_id: 'trusted_users' },
                  },
                },
              ],
            },
          ],
        },
      },
    ];

    expect(aggregateFilterListsUsage(filters, jobs)).toEqual({
      total_filter_list_count: 4,
      total_filter_item_count: 8,
      avg_items_per_filter_list: 2,
      empty_filter_list_count: 1,
      filter_lists_used_in_rules_count: 2,
    });
  });
});
