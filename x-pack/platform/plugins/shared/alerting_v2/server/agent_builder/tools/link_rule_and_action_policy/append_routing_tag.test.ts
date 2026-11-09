/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendRoutingTag } from './append_routing_tag';

describe('appendRoutingTag', () => {
  it.each([undefined, null, []])('creates the tag list when the existing tags are %p', (tags) => {
    expect(appendRoutingTag(tags, 'cpu-1234')).toEqual({ tags: ['cpu-1234'], changed: true });
  });

  it('appends the tag without overwriting the existing ones', () => {
    expect(appendRoutingTag(['team-a', 'prod'], 'cpu-1234')).toEqual({
      tags: ['team-a', 'prod', 'cpu-1234'],
      changed: true,
    });
  });

  it('is idempotent when the tag is already present', () => {
    expect(appendRoutingTag(['team-a', 'cpu-1234'], 'cpu-1234')).toEqual({
      tags: ['team-a', 'cpu-1234'],
      changed: false,
    });
  });

  it('does not mutate the input', () => {
    const existing = ['team-a'];

    const { tags } = appendRoutingTag(existing, 'cpu-1234');

    expect(existing).toEqual(['team-a']);
    expect(tags).not.toBe(existing);
  });
});
