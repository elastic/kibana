/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagWithRelations } from '../../../common/types';
import { groupDuplicateTagsByName } from './group_duplicate_tags';

const createTag = (id: string, name: string, managed = false): TagWithRelations => ({
  id,
  name,
  description: '',
  color: '#FF0088',
  managed,
  relationCount: 0,
});

describe('groupDuplicateTagsByName', () => {
  it('returns no groups when there are no duplicate names', () => {
    const tags = [createTag('1', 'foo'), createTag('2', 'bar')];
    expect(groupDuplicateTagsByName(tags)).toEqual([]);
  });

  it('groups tags sharing the exact same name', () => {
    const tags = [createTag('1', 'foo'), createTag('2', 'foo'), createTag('3', 'bar')];
    const groups = groupDuplicateTagsByName(tags);
    expect(groups).toHaveLength(1);
    expect(groups[0].tags.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('normalizes names by trimming and lowercasing before grouping', () => {
    const tags = [createTag('1', 'Foo'), createTag('2', ' foo '), createTag('3', 'FOO')];
    const groups = groupDuplicateTagsByName(tags);
    expect(groups).toHaveLength(1);
    expect(groups[0].tags.map((t) => t.id)).toEqual(['1', '2', '3']);
  });

  it('includes managed tags in a group alongside non-managed duplicates', () => {
    const tags = [createTag('1', 'foo', true), createTag('2', 'foo')];
    const groups = groupDuplicateTagsByName(tags);
    expect(groups).toHaveLength(1);
    expect(groups[0].tags.map((t) => t.id)).toEqual(['1', '2']);
  });
});
