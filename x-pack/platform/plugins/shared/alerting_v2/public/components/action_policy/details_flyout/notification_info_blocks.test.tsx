/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getNotificationInfoBlocks } from './notification_info_blocks';

jest.mock('../labels', () => ({
  DISPATCH_PER_LABEL: 'Dispatch per',
  GROUP_BY_LABEL: 'Group by',
  FREQUENCY_LABEL: 'Frequency',
  getGroupingModeLabel: (mode: string | undefined) => mode ?? 'Not configured',
  getFrequencyLabel: (throttle: { strategy?: string } | null | undefined) =>
    throttle?.strategy ?? 'Not configured',
}));

jest.mock('../badge_list', () => ({
  BadgeList: ({ items }: { items: string[] }) => <span>{items.join(', ')}</span>,
}));

describe('getNotificationInfoBlocks', () => {
  it('returns 2 blocks for per_episode mode', () => {
    const blocks = getNotificationInfoBlocks({
      grouping_mode: 'per_episode',
      group_by: null,
      throttle: { strategy: 'on_status_change', interval: null },
    });

    expect(blocks).toHaveLength(2);
    expect(blocks[0].id).toBe('dispatchMode');
    expect(blocks[1].id).toBe('frequency');
  });

  it('returns 3 blocks for per_field mode with group_by fields', () => {
    const blocks = getNotificationInfoBlocks({
      grouping_mode: 'per_field',
      group_by: ['host.name', 'service.name'],
      throttle: { strategy: 'time_interval', interval: '5m' },
    });

    expect(blocks).toHaveLength(3);
    expect(blocks[0].id).toBe('dispatchMode');
    expect(blocks[1].id).toBe('groupBy');
    expect(blocks[2].id).toBe('frequency');
  });

  it('omits the group-by block when mode is per_field but group_by is null', () => {
    const blocks = getNotificationInfoBlocks({
      grouping_mode: 'per_field',
      group_by: null,
      throttle: { strategy: 'time_interval', interval: '5m' },
    });

    expect(blocks).toHaveLength(2);
    expect(blocks.find((b) => b.id === 'groupBy')).toBeUndefined();
  });

  it('omits the group-by block when mode is per_field but group_by is empty', () => {
    const blocks = getNotificationInfoBlocks({
      grouping_mode: 'per_field',
      group_by: [],
      throttle: { strategy: 'time_interval', interval: '5m' },
    });

    expect(blocks).toHaveLength(2);
    expect(blocks.find((b) => b.id === 'groupBy')).toBeUndefined();
  });

  it('uses the correct titles', () => {
    const blocks = getNotificationInfoBlocks({
      grouping_mode: 'per_field',
      group_by: ['host.name'],
      throttle: { strategy: 'time_interval', interval: '5m' },
    });

    expect(blocks[0].title).toBe('Dispatch per');
    expect(blocks[1].title).toBe('Group by');
    expect(blocks[2].title).toBe('Frequency');
  });

  it('maintains the order Dispatch per → Group by → Frequency', () => {
    const blocks = getNotificationInfoBlocks({
      grouping_mode: 'per_field',
      group_by: ['host.name'],
      throttle: { strategy: 'time_interval', interval: '5m' },
    });

    const ids = blocks.map((b) => b.id);
    expect(ids).toEqual(['dispatchMode', 'groupBy', 'frequency']);
  });
});
