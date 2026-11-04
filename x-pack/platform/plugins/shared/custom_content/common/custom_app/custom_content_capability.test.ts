/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_TEMPLATE_LENGTH,
  appDocumentSchema,
  appDocumentShapeSchema,
  collectQueries,
} from '@kbn/custom-app-common';
import { registerCapability } from '@kbn/custom-app-registry';
import { customContentCapability } from './custom_content_capability';

beforeAll(() => registerCapability(customContentCapability));

describe('custom content nodes', () => {
  const contentDocument = (overrides: Record<string, unknown> = {}) => ({
    root: { type: 'custom_content', id: 'board', template: '<p>{{ rows.size }}</p>', ...overrides },
  });

  it('is HTML with Liquid, with or without a query', () => {
    expect(appDocumentSchema.safeParse(contentDocument()).success).toBe(true);

    const withQuery = appDocumentSchema.parse(contentDocument({ query: 'ROW a = 1', height: 400 }));
    expect(withQuery.root).toMatchObject({ query: 'ROW a = 1', height: 400 });
    expect(collectQueries(withQuery.root)).toEqual({ board: 'ROW a = 1' });
  });

  it('has no query to run when it has none', () => {
    expect(collectQueries(appDocumentSchema.parse(contentDocument()).root)).toEqual({});
  });

  it('is not saved without a template, but can ask for one in its shape', () => {
    const withoutTemplate = contentDocument({ template: undefined, prompt: 'A status board' });

    expect(appDocumentShapeSchema.safeParse(withoutTemplate).success).toBe(true);
    const result = appDocumentSchema.safeParse(withoutTemplate);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('describe what it should show');
  });

  it('refuses a script, which would never run in the frame it is shown in', () => {
    const result = appDocumentSchema.safeParse(
      contentDocument({ template: '<script>alert(1)</script>' })
    );

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('script');
  });

  it('keeps its height within what the frame allows, and its template within the limit', () => {
    expect(appDocumentSchema.safeParse(contentDocument({ height: 100 })).success).toBe(false);
    expect(appDocumentSchema.safeParse(contentDocument({ height: 5000 })).success).toBe(false);
    expect(appDocumentSchema.safeParse(contentDocument({ height: 12.5 })).success).toBe(false);
    expect(
      appDocumentSchema.safeParse(contentDocument({ template: 'x'.repeat(MAX_TEMPLATE_LENGTH) }))
        .success
    ).toBe(true);
    expect(
      appDocumentSchema.safeParse(
        contentDocument({ template: 'x'.repeat(MAX_TEMPLATE_LENGTH + 1) })
      ).success
    ).toBe(false);
  });
});
