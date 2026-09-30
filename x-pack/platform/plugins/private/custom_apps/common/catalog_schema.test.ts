/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import euiCatalogSchema from '@kbn/a2ui-eui-catalog/catalog.json';
import {
  catalogForPrompt,
  customAppCatalogSchema,
  KIBANA_COMPONENT_SCHEMAS,
} from './catalog_schema';
import { describeCatalog } from './describe_catalog';

describe('customAppCatalogSchema', () => {
  it('is the base catalog plus exactly the plugin components', () => {
    const base = Object.keys(euiCatalogSchema.components);
    const extended = Object.keys(customAppCatalogSchema.components);
    expect(extended).toEqual(expect.arrayContaining(base));
    expect(extended.filter((name) => !base.includes(name)).sort()).toEqual(
      Object.keys(KIBANA_COMPONENT_SCHEMAS).sort()
    );
  });

  it('keeps the shared package free of plugin-backed components', () => {
    // The base catalog must stay usable without plugin dependencies.
    expect(Object.keys(euiCatalogSchema.components)).not.toContain('KbnLensPanel');
  });
});

describe('the prompt the agent actually receives', () => {
  const text = describeCatalog(catalogForPrompt);

  it('names every component in the full catalog, not just the base one', () => {
    // The earlier version of this assertion measured the base catalog, so the
    // three plugin components were never checked against the prompt at all.
    for (const name of Object.keys(customAppCatalogSchema.components)) {
      expect(text).toContain(`- ${name}:`);
    }
  });

  it('stays small enough to sit in every turn', () => {
    // ~3k tokens. The raw JSON Schema is several times this.
    expect(text.length).toBeLessThan(12000);
  });

  it('holds no single component to more than its share of the budget', () => {
    // The total cap only tells you that the budget was overspent; this says which
    // component did it, which is the assertion that keeps the file honest.
    const lines = text.split('\n');
    const start = lines.indexOf('Components:') + 1;
    const end = lines.findIndex((line, index) => index > start && line.startsWith('Functions'));
    const componentLines = lines
      .slice(start, end === -1 ? undefined : end)
      .filter((line) => line.startsWith('- '));

    expect(componentLines).toHaveLength(Object.keys(customAppCatalogSchema.components).length);
    expect(componentLines.filter((line) => line.length > 400)).toEqual([]);
  });
});
