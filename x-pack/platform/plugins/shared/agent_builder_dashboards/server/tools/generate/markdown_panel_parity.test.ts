/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MARKDOWN_EMBEDDABLE_TYPE as EMBEDDABLE_MARKDOWN_TYPE,
  markdownByValueStateSchema,
} from '@kbn/dashboard-markdown/server';
import {
  MARKDOWN_EMBEDDABLE_TYPE,
  markdownPanelConfigSchema,
} from '@kbn/dashboard-agent-authoring';

/**
 * Drift guard: the markdown embeddable type and by-value config the tool accepts
 * are hand-maintained copies of the dashboard-markdown plugin's constant and
 * by-value state (shared packages cannot import that plugin). Every config that
 * passes the tool's input schema must also be accepted by the real embeddable
 * schema, otherwise the tool would persist panels the dashboard cannot render.
 * If the embeddable contract changes, these assertions fail instead of shipping
 * broken dashboards.
 */
describe('markdownPanelConfigSchema parity with the embeddable by-value state', () => {
  it('stores panels as the dashboard-markdown embeddable type', () => {
    expect(MARKDOWN_EMBEDDABLE_TYPE).toBe(EMBEDDABLE_MARKDOWN_TYPE);
  });

  it.each([
    { content: 'hello' },
    { content: 'hello', settings: {} },
    { content: 'hello', settings: { open_links_in_new_tab: true } },
    { content: 'hello', settings: { open_links_in_new_tab: false } },
  ])('produces embeddable-valid by-value state for %j', (input) => {
    const parsed = markdownPanelConfigSchema.parse(input);

    expect(() => markdownByValueStateSchema.parse(parsed)).not.toThrow();
  });

  it('relies on the embeddable to default open_links_in_new_tab to true when settings is omitted', () => {
    const parsed = markdownPanelConfigSchema.parse({ content: 'hello' });

    expect(markdownByValueStateSchema.parse(parsed)).toEqual({
      content: 'hello',
      settings: { open_links_in_new_tab: true },
    });
  });
});
