/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SOURCE_SLUG_LENGTH } from './view_name';
import {
  MAX_NIGHTSHIFT_SOURCE_SLUGS,
  nightshiftSourceSlugField,
  nightshiftSourceSlugSchema,
  nightshiftSourceSlugsSchema,
} from './schema';

describe('nightshiftSourceSlugSchema', () => {
  it('accepts a source slug', () => {
    expect(nightshiftSourceSlugSchema.safeParse('nginx-errors').success).toBe(true);
  });

  it('rejects an empty slug and a slug past the length cap', () => {
    expect(nightshiftSourceSlugSchema.safeParse('').success).toBe(false);
    expect(
      nightshiftSourceSlugSchema.safeParse('n'.repeat(MAX_SOURCE_SLUG_LENGTH + 1)).success
    ).toBe(false);
  });

  it('keeps the shared description and appends the caller sentence', () => {
    expect(nightshiftSourceSlugField('The source must be enabled.').description).toBe(
      'Nightshift source slug, e.g. "nginx-errors". Not the title and not the view name. The source must be enabled.'
    );
  });
});

describe('nightshiftSourceSlugsSchema', () => {
  it('rejects a list longer than one page of sources', () => {
    const slugs = Array.from(
      { length: MAX_NIGHTSHIFT_SOURCE_SLUGS + 1 },
      (_, index) => `source-${index}`
    );
    expect(nightshiftSourceSlugsSchema.safeParse(slugs).success).toBe(false);
  });
});
