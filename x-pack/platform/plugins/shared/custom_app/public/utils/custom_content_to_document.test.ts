/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema } from '@kbn/custom-app-common';
import { customContentToDocument } from './custom_content_to_document';

const children = (state: Parameters<typeof customContentToDocument>[0]) =>
  (customContentToDocument(state).root as { children: Array<Record<string, unknown>> }).children;

describe('customContentToDocument', () => {
  it('makes an app whose one component is the content, with its query and template', () => {
    const document = customContentToDocument({
      esql_query: ['FROM status | LIMIT 5'],
      template: '<b>{{ rows.size }}</b>',
    });

    expect(appDocumentSchema.safeParse(document).success).toBe(true);
    expect(children({ esql_query: ['FROM status'], template: '<p>x</p>' })).toEqual([
      expect.objectContaining({
        type: 'custom_content',
        query: 'FROM status',
        template: '<p>x</p>',
      }),
    ]);
  });

  it('keeps a panel with no query as it is, a template that is shown as written', () => {
    const [content] = children({ template: '<p>static</p>' });

    expect(content).toMatchObject({ type: 'custom_content', template: '<p>static</p>' });
    expect(content).not.toHaveProperty('query');
  });

  it('gives the app the control of the period when the query uses the period of the dashboard', () => {
    const nodes = children({
      esql_query: ['FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend'],
      template: '<p>x</p>',
    });

    expect(nodes.map(({ type }) => type)).toEqual(['stack', 'custom_content']);
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

  it('says what is wrong when what the panel holds is not something an app can', () => {
    expect(() => customContentToDocument({ template: 'x'.repeat(40_001) })).toThrow();
  });
});
