/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrateTo660 } from './space_migrations';
import type { Space } from '../../../common';

describe('migrateTo660', () => {
  it('adds a "disabledFeatures" attribute initialized as an empty array', () => {
    expect(
      migrateTo660({
        id: 'space:foo',
        type: 'space',
        attributes: {} as Space,
      })
    ).toEqual({
      id: 'space:foo',
      type: 'space',
      attributes: {
        disabledFeatures: [],
      },
    });
  });

  it('does not initialize "disabledFeatures" if the property already exists', () => {
    // This scenario shouldn't happen organically. Protecting against defects in the migration.
    expect(
      migrateTo660({
        id: 'space:foo',
        type: 'space',
        attributes: {
          disabledFeatures: ['foo', 'bar', 'baz'],
        } as Space,
      })
    ).toEqual({
      id: 'space:foo',
      type: 'space',
      attributes: {
        disabledFeatures: ['foo', 'bar', 'baz'],
      },
    });
  });
});
