/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customAppCatalogSchema } from '../../common/catalog_schema';
import { createCreateAppTool } from './tools';

describe('createCreateAppTool', () => {
  const { description } = createCreateAppTool();

  it('describes every component the catalog declares', () => {
    // The merge used to be hand-copied here, so the server's prompt could omit a
    // component the browser happily rendered. Deriving both from one list is the
    // fix; this is the assertion that catches anyone undoing it.
    for (const name of Object.keys(customAppCatalogSchema.components)) {
      expect(description).toContain(`- ${name}:`);
    }
  });

  it('tells the agent the data model is shared across panels', () => {
    // Without this the agent reuses `/selected` in two panels and they overwrite
    // each other — a failure that only shows up at runtime.
    expect(description).toContain('share ONE data model');
    expect(description).toContain('/ui/<panelId>/');
  });

  it('quotes the catalog id the surfaces must declare', () => {
    expect(description).toContain(customAppCatalogSchema.catalogId);
  });
});
