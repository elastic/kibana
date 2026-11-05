/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customContentToDocument } from './custom_content_to_document';

const children = (state: Parameters<typeof customContentToDocument>[0]) =>
  (customContentToDocument(state).root as { children: Array<Record<string, unknown>> }).children;

describe('customContentToDocument', () => {
  it('makes an app whose one component is the content panel, with its query and template', () => {
    const document = customContentToDocument({
      esql_query: ['FROM status | LIMIT 5'],
      template: '<b>{{ rows.size }}</b>',
    });

    expect(document.root).toMatchObject({ type: 'stack', id: 'root' });
    expect(children({ esql_query: ['FROM status'], template: '<p>x</p>' })).toEqual([
      expect.objectContaining({
        type: 'embeddable',
        embeddableType: 'custom_content',
        state: { esql_query: ['FROM status'], template: '<p>x</p>' },
      }),
    ]);
  });

  it('keeps a panel with no query as it is, a template that is shown as written', () => {
    const [content] = children({ template: '<p>static</p>' });

    expect(content).toMatchObject({
      type: 'embeddable',
      state: { template: '<p>static</p>' },
    });
    expect(JSON.stringify(content)).not.toContain('esql_query');
  });

  it('gives the app the control of the period when the query uses the period of the dashboard', () => {
    const nodes = children({
      esql_query: ['FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend'],
      template: '<p>x</p>',
    });

    expect(nodes.map(({ type }) => type)).toEqual(['stack', 'embeddable']);
    expect(JSON.stringify(nodes[0])).toContain('time_range');
  });

  it('adds no control of the period when the query does not use it', () => {
    expect(children({ esql_query: ['FROM logs | LIMIT 1'], template: '<p>x</p>' })).toHaveLength(1);
  });

  it('says so when the panel has no template yet', () => {
    expect(() => customContentToDocument({ esql_query: ['FROM logs'] })).toThrow(
      'This panel has no content yet.'
    );
  });
});
