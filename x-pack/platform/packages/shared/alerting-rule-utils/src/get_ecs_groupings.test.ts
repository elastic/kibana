/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEcsGroupings } from './get_ecs_groupings';

describe('getEcsGroups', () => {
  it('should return all groups if they are string ecs fields', () => {
    const groupings = {
      host: {
        name: 'host-1',
      },
      container: {
        id: 'container-1',
      },
    };

    expect(getEcsGroupings(groupings)).toEqual({
      'host.name': 'host-1',
      'container.id': 'container-1',
    });
  });

  it('should not return group with field types other than keyword', () => {
    const groupings = {
      client: {
        as: {
          number: 'some-value',
        },
      },
    };

    expect(getEcsGroupings(groupings)).toEqual({});
  });

  it('should not return non-ECS group with field', () => {
    const groupings = {
      non: {
        ecs: {
          field: 'some-value',
        },
      },
      'non-ecs-field': 'some-value',
    };

    expect(getEcsGroupings(groupings)).toEqual({});
  });

  it('should handle array types assigned non-array values', () => {
    const groupings = {
      tags: 'abc',
    };

    expect(getEcsGroupings(groupings)).toEqual({ tags: ['abc'] });
  });
});
