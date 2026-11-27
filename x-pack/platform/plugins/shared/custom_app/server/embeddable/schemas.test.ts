/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customAppEmbeddableSchema } from './schemas';

const document = { state: {}, root: { type: 'heading', id: 'title', text: 'Hi' } };

describe('the custom app panel schema', () => {
  it('accepts an app of the panel, with its titles and time range', () => {
    const result = customAppEmbeddableSchema.safeParse({
      version: 1,
      document,
      title: 'Mine',
      time_range: { from: 'now-1h', to: 'now' },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a link to an app of the library, which carries no document', () => {
    const result = customAppEmbeddableSchema.safeParse({ ref_id: 'app-1', title: 'Mine' });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ ref_id: 'app-1' });
    expect(result.data).not.toHaveProperty('document');
  });

  it('refuses a panel that is neither: no document and no link', () => {
    expect(customAppEmbeddableSchema.safeParse({ title: 'Mine' }).success).toBe(false);
  });

  it('refuses an app of the panel whose document is not valid', () => {
    expect(
      customAppEmbeddableSchema.safeParse({
        version: 1,
        document: { state: {}, root: { type: 'carousel', id: 'x' } },
      }).success
    ).toBe(false);
  });
});
