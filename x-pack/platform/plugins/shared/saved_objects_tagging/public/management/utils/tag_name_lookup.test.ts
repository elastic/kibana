/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagWithRelations } from '../../../common/types';
import { buildTagNameLookup } from './tag_name_lookup';

const createTag = (id: string, name: string): TagWithRelations => ({
  id,
  name,
  description: '',
  color: '#FF0088',
  managed: false,
  relationCount: 0,
});

describe('buildTagNameLookup', () => {
  it('resolves a known id to its tag name', () => {
    const getName = buildTagNameLookup([createTag('1', 'foo'), createTag('2', 'bar')]);
    expect(getName('1')).toEqual('foo');
    expect(getName('2')).toEqual('bar');
  });

  it('returns undefined for an unknown id', () => {
    const getName = buildTagNameLookup([createTag('1', 'foo')]);
    expect(getName('unknown')).toBeUndefined();
  });
});
