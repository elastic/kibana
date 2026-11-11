/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { CUSTOM_CONTENT_MAX_ESQL_QUERIES } from '@kbn/custom-content-common';
import { customContentEmbeddableSchema } from './schemas';

// The dashboards server receives this schema through `getSchema`, parses panel configs with it,
// builds its REST API schema from it and generates the OpenAPI spec from that. The schema is
// created lazily, so these tests use it the way those consumers do rather than only calling parse.
describe('customContentEmbeddableSchema', () => {
  const queries = (count: number) => Array.from({ length: count }, (_, i) => `FROM index-${i}`);

  it.each([[0], [1], [2], [CUSTOM_CONTENT_MAX_ESQL_QUERIES]])(
    'accepts a panel config with %s ES|QL queries',
    (count) => {
      expect(
        customContentEmbeddableSchema.safeParse({ esql_query: queries(count), template: '<p/>' })
          .success
      ).toBe(true);
    }
  );

  it('rejects a panel config with more queries than a panel can hold', () => {
    expect(
      customContentEmbeddableSchema.safeParse({
        esql_query: queries(CUSTOM_CONTENT_MAX_ESQL_QUERIES + 1),
      }).success
    ).toBe(false);
  });

  it('accepts a config with only the title fields, since the content is optional', () => {
    expect(customContentEmbeddableSchema.safeParse({ title: 'My panel' }).success).toBe(true);
  });

  it('keeps the content fields next to the title and time range fields', () => {
    const parsed = customContentEmbeddableSchema.parse({
      title: 'My panel',
      time_range: { from: 'now-15m', to: 'now' },
      esql_query: ['FROM logs', 'FROM metrics'],
      template: '<p/>',
    });

    expect(parsed).toEqual({
      title: 'My panel',
      time_range: { from: 'now-15m', to: 'now' },
      esql_query: ['FROM logs', 'FROM metrics'],
      template: '<p/>',
    });
  });

  it('composes into a discriminated union of panels, as the dashboards schema does', () => {
    const panels = z.discriminatedUnion('type', [
      z.object({ type: z.literal('custom_content'), config: customContentEmbeddableSchema }),
      z.object({ type: z.literal('markdown'), config: z.object({ content: z.string() }) }),
    ]);

    expect(
      panels.safeParse({ type: 'custom_content', config: { esql_query: queries(2) } }).success
    ).toBe(true);
    expect(
      panels.safeParse({
        type: 'custom_content',
        config: { esql_query: queries(CUSTOM_CONTENT_MAX_ESQL_QUERIES + 1) },
      }).success
    ).toBe(false);
    expect(panels.safeParse({ type: 'markdown', config: { content: 'hi' } }).success).toBe(true);
  });

  it('describes the queries as an array of at most the cap in the JSON schema the OpenAPI spec uses', () => {
    const panel = z.object({
      type: z.literal('custom_content'),
      config: customContentEmbeddableSchema,
    });

    expect(z.toJSONSchema(panel)).toMatchObject({
      properties: {
        config: {
          properties: {
            esql_query: {
              type: 'array',
              maxItems: CUSTOM_CONTENT_MAX_ESQL_QUERIES,
              items: { type: 'string' },
            },
          },
        },
      },
    });
  });
});
