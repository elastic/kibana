/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFormattedGroups, unflattenGrouping, getFlattenGrouping } from './group_by_object_utils';

describe('getFormattedGroups', () => {
  it('should format groupBy correctly for empty input', () => {
    expect(getFormattedGroups()).toBeUndefined();
  });

  it('should format groupBy correctly for multiple groups', () => {
    expect(
      getFormattedGroups({
        'host.name': 'host-0',
        'host.mac': '00-00-5E-00-53-23',
        tags: 'event-0',
        'container.name': 'container-name',
      })
    ).toEqual([
      { field: 'host.name', value: 'host-0' },
      { field: 'host.mac', value: '00-00-5E-00-53-23' },
      { field: 'tags', value: 'event-0' },
      { field: 'container.name', value: 'container-name' },
    ]);
  });
});

describe('unflattenGrouping', () => {
  it('should return undefined when there is no grouping', () => {
    expect(unflattenGrouping()).toBeUndefined();
  });

  it('should return an object containing groups for one groupBy field', () => {
    expect(unflattenGrouping({ 'host.name': 'host-0' })).toEqual({ host: { name: 'host-0' } });
  });

  it('should return an object containing groups for multiple groupBy fields', () => {
    expect(unflattenGrouping({ 'host.name': 'host-0', 'container.id': 'container-0' })).toEqual({
      container: { id: 'container-0' },
      host: { name: 'host-0' },
    });
  });
});

describe('getFlattenGrouping', () => {
  it('should return undefined when groupBy is not provided', () => {
    expect(
      getFlattenGrouping({ groupBy: undefined, bucketKey: { key0: 'value' } })
    ).toBeUndefined();
  });

  it('should flatten grouping for a single groupBy string', () => {
    expect(
      getFlattenGrouping({
        groupBy: 'host.name',
        bucketKey: { key0: 'host-0' },
      })
    ).toEqual({ 'host.name': 'host-0' });
  });

  it('should flatten grouping for multiple groupBy fields', () => {
    expect(
      getFlattenGrouping({
        groupBy: ['host.name', 'container.id'],
        bucketKey: { key0: 'host-0', key1: 'container-0' },
      })
    ).toEqual({ 'host.name': 'host-0', 'container.id': 'container-0' });
  });
});
