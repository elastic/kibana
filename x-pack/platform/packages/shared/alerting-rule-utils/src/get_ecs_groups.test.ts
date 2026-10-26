/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEcsGroups, getEcsGroupsFromFlattenGrouping } from './get_ecs_groups';

describe('getEcsGroups', () => {
  it('should return all groups if they are string ecs fields', () => {
    const groups = [
      {
        field: 'host.name',
        value: 'host-1',
      },
      {
        field: 'container.id',
        value: 'container-1',
      },
    ];

    expect(getEcsGroups(groups)).toEqual({
      'host.name': 'host-1',
      'container.id': 'container-1',
    });
  });

  it('should not return group with field types other than keyword', () => {
    const groups = [
      {
        field: 'client.as.number',
        value: 'some-value',
      },
    ];

    expect(getEcsGroups(groups)).toEqual({});
  });

  it('should not return non-ECS group with field', () => {
    const groups = [
      {
        field: 'non.ecs.field',
        value: 'some-value',
      },
      {
        field: 'non-ecs-field',
        value: 'some-value',
      },
    ];

    expect(getEcsGroups(groups)).toEqual({});
  });

  it('should handle array types assigned non-array values', () => {
    const groups = [
      {
        field: 'tags',
        value: 'abc',
      },
    ];

    expect(getEcsGroups(groups)).toEqual({ tags: ['abc'] });
  });
});

describe('getEcsGroupsFromFlattenGrouping', () => {
  it('should return all groups if they are string ecs fields', () => {
    const flattenGrouping = { ['host.name']: 'host-1', ['container.id']: 'container-1' };

    expect(getEcsGroupsFromFlattenGrouping(flattenGrouping)).toEqual({
      'host.name': 'host-1',
      'container.id': 'container-1',
    });
  });

  it('should not return group with field types other than keyword', () => {
    const flattenGrouping = { ['client.as.number']: 'some-value' };

    expect(getEcsGroupsFromFlattenGrouping(flattenGrouping)).toEqual({});
  });

  it('should not return non-ECS group with field', () => {
    const flattenGrouping = { ['non.ecs.field']: 'some-value' };

    expect(getEcsGroupsFromFlattenGrouping(flattenGrouping)).toEqual({});
  });

  it('should handle ecs and non-ecs fields properly', () => {
    const flattenGrouping = {
      ['host.name']: 'host-1',
      ['container.id']: 'container-1',
      ['non.ecs.field']: 'some-value',
    };

    expect(getEcsGroupsFromFlattenGrouping(flattenGrouping)).toEqual({
      'host.name': 'host-1',
      'container.id': 'container-1',
    });
  });

  it('should handle array types assigned non-array values', () => {
    const flattenGrouping = { tags: 'abc' };

    expect(getEcsGroupsFromFlattenGrouping(flattenGrouping)).toEqual({ tags: ['abc'] });
  });
});
