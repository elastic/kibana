/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiCatalogSchema } from '@kbn/a2ui-eui-catalog';
import { customAppCatalog, customAppCatalogSchema } from '.';

describe('customAppCatalog', () => {
  it('implements exactly the components its schema declares', () => {
    expect(Object.keys(customAppCatalog.components).sort()).toEqual(
      Object.keys(customAppCatalogSchema.components).sort()
    );
  });

  it('adds the Kibana components on top of the base EUI catalog', () => {
    const base = Object.keys(euiCatalogSchema.components);
    const extended = Object.keys(customAppCatalogSchema.components);
    expect(extended).toEqual(expect.arrayContaining(base));
    expect(extended.filter((name) => !base.includes(name))).toEqual(['KbnLensPanel']);
  });

  it('requires a KbnLensPanel to be either by-reference or by-value, not neither', () => {
    const schema = customAppCatalogSchema.components.KbnLensPanel;
    expect(schema.oneOf).toEqual([{ required: ['savedObjectId'] }, { required: ['attributes'] }]);
  });

  it('keeps the base catalog free of plugin-backed components', () => {
    // The shared package must stay usable without plugin dependencies.
    expect(Object.keys(euiCatalogSchema.components)).not.toContain('KbnLensPanel');
  });
});
