/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customAppCatalog, customAppCatalogSchema, KIBANA_COMPONENT_SCHEMAS } from '.';

describe('customAppCatalog', () => {
  it('implements exactly the components its schema declares', () => {
    expect(Object.keys(customAppCatalog.components).sort()).toEqual(
      Object.keys(customAppCatalogSchema.components).sort()
    );
  });

  it('registers a runtime implementation for each declared Kibana component', () => {
    // Derived from the shared list rather than a hardcoded one, so adding a
    // component is a single edit instead of four.
    for (const name of Object.keys(KIBANA_COMPONENT_SCHEMAS)) {
      expect(customAppCatalog.components[name]).toBeDefined();
    }
  });

  it('requires a KbnLensPanel to be either by-reference or by-value, not neither', () => {
    const schema = customAppCatalogSchema.components.KbnLensPanel;
    expect(schema.oneOf).toEqual([{ required: ['savedObjectId'] }, { required: ['attributes'] }]);
  });
});
