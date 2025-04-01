/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { byNameTagSorter } from './utils';

const createTag = (id: string, name: string = id) => ({
  id,
  name,
  description: `desc ${id}`,
  color: '#FFCC00',
  managed: false,
});

describe('byNameTagSorter', () => {
  it('sorts tags by name', () => {
    const tags = [
      createTag('id-1', 'tag-b'),
      createTag('id-2', 'tag-a'),
      createTag('id-3', 'tag-d'),
      createTag('id-4', 'tag-c'),
    ];

    tags.sort(byNameTagSorter);

    expect(tags.map(({ id }) => id)).toEqual(['id-2', 'id-1', 'id-4', 'id-3']);
  });
});
