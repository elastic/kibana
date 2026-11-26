/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unionEntities } from './union_entities';

describe('unionEntities', () => {
  it('keeps the first position of an id and fills in fields a later write sends', () => {
    expect(
      unionEntities([
        { id: 'a', name: 'first' },
        { id: 'b' },
        { id: 'a', name: 'second', type: 'host' },
      ])
    ).toEqual([{ id: 'a', name: 'second', type: 'host' }, { id: 'b' }]);
  });

  it('does not let an absent field erase a stored one', () => {
    expect(unionEntities([{ id: 'a', type: 'host' }, { id: 'a' }])).toEqual([
      { id: 'a', type: 'host' },
    ]);
  });
});
