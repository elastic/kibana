/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectApiBodyEntryRoundTrip } from '@kbn/saved-objects-management-plugin/server/mocks';
import type { TagAttributes } from '../../common/types';
import { createTagApiBodyEntry } from './tag_api_body_entry';

const storedTag = (attributes: Partial<TagAttributes> = {}) => ({
  attributes: { name: 'Web', description: '', color: '#772299', ...attributes },
  references: [],
});

describe('tag API body entry', () => {
  const entry = createTagApiBodyEntry();

  it('round-trips a tag with a description', () => {
    expect(
      expectApiBodyEntryRoundTrip(entry, storedTag({ description: 'Web traffic dashboards' }))
    ).toEqual({ name: 'Web', description: 'Web traffic dashboards', color: '#772299' });
  });

  it('round-trips a tag without a description, leaving the empty one out of the body', () => {
    expect(expectApiBodyEntryRoundTrip(entry, storedTag())).toEqual({
      name: 'Web',
      color: '#772299',
    });
  });

  it('stores a random color for a body without one, as the PUT route does', () => {
    const { attributes } = entry.toStored({ name: 'Web' });

    expect(attributes).toEqual({ name: 'Web', description: '', color: expect.any(String) });
    expect(attributes.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('throws for attributes the PUT route rejects, such as a color that is not hex', () => {
    expect(() => entry.toStored({ name: 'Web', color: 'red' })).toThrow('valid hex color');
  });
});
