/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoostProfile,
  BoostProfileType,
  BoostRuleListItem,
  BoostRuleMatch,
  DataRetention,
} from '../../../common/types';

export const mockProfiles: BoostProfile[] = [
  {
    name: '_performant_indices',
    is_builtin: true,
    type: 'indices',
    min_boost: 1,
    max_boost: 1,
    availability: 'base',
    prewarm: true,
    pinned: true,
  },
  {
    name: '_performant_data_streams',
    is_builtin: true,
    type: 'data_streams',
    recent: { min_boost: 1, max_boost: 1, max_age: '365d' },
    standard: { min_boost: 1, max_boost: 1, max_age: '365d' },
    background: { min_boost: 0, max_boost: 0.5 },
  },
  {
    name: 'catalog-fast',
    is_builtin: false,
    type: 'indices',
    min_boost: 2,
    max_boost: 8.5,
    availability: 'one_extra_copy',
    prewarm: true,
    pinned: false,
  },
  {
    name: 'logs-recent-week',
    is_builtin: false,
    type: 'data_streams',
    recent: { min_boost: 1.5, max_boost: 5000, max_age: '1d' },
    standard: { min_boost: 1, max_boost: 10, max_age: '7d' },
    background: { min_boost: 0, max_boost: 1 },
  },
  {
    name: 'archive-cheap',
    is_builtin: false,
    type: 'indices',
    min_boost: 0,
    max_boost: 0.25,
    availability: 'base',
    prewarm: false,
    pinned: false,
  },
];

const DAY_IN_MS = 86_400_000;
const THIRTY_DAYS: DataRetention = {
  type: 'value',
  value: '30 days',
  inMilliseconds: 30 * DAY_IN_MS,
};

export const mockRules: BoostRuleListItem[] = [
  {
    name: '_default_indices',
    index_pattern: '*',
    boost_profile: '_performant_indices',
    priority: -100,
    is_builtin: true,
    type: 'indices',
    matches: [
      {
        name: 'catalog-products',
        isHidden: false,
        outrankedByRuleName: 'catalog',
        storageSizeInBytes: 1_200_000_000,
      },
      {
        name: 'catalog-reviews',
        isHidden: false,
        outrankedByRuleName: 'catalog',
        storageSizeInBytes: 340_000_000,
      },
      { name: 'customers', isHidden: false, storageSizeInBytes: 52_000_000 },
      { name: 'orders', isHidden: false, storageSizeInBytes: 8_400_000_000 },
      { name: '.kibana-observability-ai-assistant', isHidden: true, storageSizeInBytes: 1_200_000 },
      { name: '.internal-alerts', isHidden: true, storageSizeInBytes: 640_000 },
    ],
  },
  {
    name: '_default_data_streams',
    index_pattern: '*',
    boost_profile: '_performant_data_streams',
    priority: -100,
    is_builtin: true,
    type: 'data_streams',
    matches: [
      {
        name: 'logs-nginx-default',
        isHidden: false,
        outrankedByRuleName: 'web-logs',
        storageSizeInBytes: 21_000_000_000,
        retention: THIRTY_DAYS,
      },
      {
        name: 'logs-apache-default',
        isHidden: false,
        outrankedByRuleName: 'apache-logs',
        storageSizeInBytes: 7_500_000_000,
        retention: { type: 'infinite' },
      },
      {
        name: 'metrics-system-default',
        isHidden: false,
        storageSizeInBytes: 3_100_000_000,
        retention: { type: 'disabled' },
      },
    ],
  },
  {
    name: 'catalog',
    index_pattern: 'catalog-*',
    boost_profile: 'catalog-fast',
    priority: 10,
    is_builtin: false,
    type: 'indices',
    matches: [
      { name: 'catalog-products', isHidden: false, storageSizeInBytes: 1_200_000_000 },
      { name: 'catalog-reviews', isHidden: false, storageSizeInBytes: 340_000_000 },
    ],
  },
  {
    name: 'web-logs',
    index_pattern: 'logs-*',
    boost_profile: 'logs-recent-week',
    priority: 5,
    is_builtin: false,
    type: 'data_streams',
    matches: [
      {
        name: 'logs-nginx-default',
        isHidden: false,
        storageSizeInBytes: 21_000_000_000,
        retention: THIRTY_DAYS,
      },
      {
        name: 'logs-apache-default',
        isHidden: false,
        outrankedByRuleName: 'apache-logs',
        storageSizeInBytes: 7_500_000_000,
        retention: { type: 'infinite' },
      },
    ],
  },
  {
    name: 'apache-logs',
    index_pattern: 'logs-apache-default',
    boost_profile: 'logs-recent-week',
    priority: 5,
    is_builtin: false,
    type: 'data_streams',
    matches: [
      {
        name: 'logs-apache-default',
        isHidden: false,
        storageSizeInBytes: 7_500_000_000,
        retention: { type: 'infinite' },
      },
    ],
  },
  {
    name: 'old-archives',
    index_pattern: 'archive-*',
    boost_profile: 'archive-cheap',
    priority: 0,
    is_builtin: false,
    type: 'indices',
    matches: [],
  },
];

export const createMockRules = (count: number): BoostRuleListItem[] =>
  Array.from({ length: count }, (_, index) => {
    const id = String(index + 1).padStart(2, '0');
    return {
      name: `rule-${id}`,
      index_pattern: `index-${id}-*`,
      boost_profile: index % 2 === 0 ? 'catalog-fast' : 'archive-cheap',
      priority: index,
      is_builtin: false,
      type: 'indices',
      matches: [
        { name: `index-${id}-a`, isHidden: false, storageSizeInBytes: (index + 1) * 1_000_000 },
      ],
    };
  });

const RETENTIONS: DataRetention[] = [
  { type: 'value', value: '7 days', inMilliseconds: 7 * DAY_IN_MS },
  THIRTY_DAYS,
  { type: 'infinite' },
  { type: 'disabled' },
];

export const createMockMatches = (type: BoostProfileType, count: number): BoostRuleMatch[] =>
  Array.from({ length: count }, (_, index) => {
    const id = String(index + 1).padStart(2, '0');
    const isHidden = index % 8 === 7;
    const name = type === 'data_streams' ? `logs-app-${id}` : `products-${id}`;
    return {
      name: isHidden ? `.${name}` : name,
      isHidden,
      storageSizeInBytes: (((index * 37) % 50) + 1) * 100_000_000,
      ...(type === 'data_streams' && { retention: RETENTIONS[index % RETENTIONS.length] }),
    };
  });

export const withOutranked = (
  matches: BoostRuleMatch[],
  outrankedByRuleName: string,
  indexes: number[]
): BoostRuleMatch[] =>
  matches.map((match, index) =>
    indexes.includes(index) ? { ...match, outrankedByRuleName } : match
  );
