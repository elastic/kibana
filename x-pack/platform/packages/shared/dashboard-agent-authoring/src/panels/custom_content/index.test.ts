/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customContentPanelKind } from '.';

describe('custom content panel kind schemas', () => {
  const add = (input: Record<string, unknown>) =>
    customContentPanelKind.addInputSchema.safeParse({
      source: 'request',
      renderer: 'custom_content',
      query: 'status card per host',
      ...input,
    });
  const edit = (input: Record<string, unknown>) =>
    customContentPanelKind.editInputSchema.safeParse({
      source: 'request',
      renderer: 'custom_content',
      panelId: 'panel-1',
      ...input,
    });

  describe('add', () => {
    it('accepts a static panel with only a description', () => {
      expect(add({}).success).toBe(true);
    });

    it('accepts hasData and index to request a generated query', () => {
      expect(add({ hasData: true, index: 'logs-*' }).success).toBe(true);
    });

    it('rejects an index longer than the limit', () => {
      expect(add({ index: 'x'.repeat(257) }).success).toBe(false);
    });
  });

  describe('edit', () => {
    it('accepts a style-only edit', () => {
      expect(edit({ query: 'make the badges blue' }).success).toBe(true);
    });

    it('accepts replacing or removing the query without a description', () => {
      expect(edit({ esql: 'FROM logs-*' }).success).toBe(true);
      expect(edit({ esql: null }).success).toBe(true);
      expect(edit({ hasData: false }).success).toBe(true);
    });

    it('accepts regenerateEsql with a description', () => {
      expect(edit({ query: 'also show errors', regenerateEsql: true }).success).toBe(true);
    });

    it('requires a description to regenerate the query or to add data', () => {
      expect(edit({ regenerateEsql: true }).success).toBe(false);
      expect(edit({ hasData: true }).success).toBe(false);
      expect(edit({ esql: 'FROM logs-*', regenerateEsql: true }).success).toBe(false);
    });

    it('rejects regenerateEsql together with hasData: false', () => {
      expect(edit({ query: 'show hosts', regenerateEsql: true, hasData: false }).success).toBe(
        false
      );
    });

    it('rejects an empty edit', () => {
      expect(edit({}).success).toBe(false);
    });
  });
});
