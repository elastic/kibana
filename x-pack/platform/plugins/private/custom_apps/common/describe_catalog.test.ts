/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import euiCatalogSchema from '@kbn/a2ui-eui-catalog/catalog.json';
import { describeCatalog } from './describe_catalog';

const schema = euiCatalogSchema as Parameters<typeof describeCatalog>[0];

describe('describeCatalog', () => {
  const text = describeCatalog(schema);

  it('names every component the catalog declares', () => {
    for (const name of Object.keys(schema.components)) {
      expect(text).toContain(`- ${name}:`);
    }
  });

  it('names every function the catalog declares', () => {
    for (const name of Object.keys(schema.functions ?? {})) {
      expect(text).toContain(`- ${name} —`);
    }
  });

  it('marks required props with an asterisk and leaves optional ones bare', () => {
    // Text requires `text` and treats `variant` as optional.
    expect(text).toMatch(/- Text: text\*/);
    expect(text).toContain('variant (heading1|heading2|heading3|body|caption)');
  });

  it('omits the `component` discriminator, which the agent never sets by hand', () => {
    expect(text).not.toContain('component*');
  });

  it('carries the authoring rules through', () => {
    expect(text).toContain('Rules:');
    expect(text).toContain("must have the id 'root'");
  });

  // The size budget is asserted in catalog_schema.test.ts, against the full
  // catalog the agent is actually sent. Measuring the base catalog here, as this
  // file used to, never saw the three plugin components in the prompt.
});
