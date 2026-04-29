/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { suggestionsAbstraction } from './constants';
import { enhanceSuggestionAbstractionFields } from './helpers';
import { validateFieldsKueryNode } from './validate_kuery_node';

describe('validateFieldsKueryNode', () => {
  const TestSuggestionsAbstractions = enhanceSuggestionAbstractionFields(suggestionsAbstraction);
  test('validate a valid kuery node', () => {
    const astFilter = fromKueryExpression('tags: "fast" and enabled: true');

    expect(
      validateFieldsKueryNode({
        astFilter,
        suggestionsAbstraction: TestSuggestionsAbstractions,
      })
    ).toMatchInlineSnapshot(`undefined`);
    expect(astFilter).toMatchInlineSnapshot(`
      Object {
        "arguments": Array [
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "alert.attributes.tags",
              },
              Object {
                "isQuoted": true,
                "type": "literal",
                "value": "fast",
              },
            ],
            "function": "is",
            "type": "function",
          },
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "alert.attributes.enabled",
              },
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": true,
              },
            ],
            "function": "is",
            "type": "function",
          },
        ],
        "function": "and",
        "type": "function",
      }
    `);
  });

  test('validate a valid nested kuery node', () => {
    const astFilter = fromKueryExpression('actions: { id: ".email" } and enabled: true');

    expect(
      validateFieldsKueryNode({
        astFilter,
        suggestionsAbstraction: TestSuggestionsAbstractions,
      })
    ).toMatchInlineSnapshot(`undefined`);

    expect(astFilter).toMatchInlineSnapshot(`
      Object {
        "arguments": Array [
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "alert.attributes.actions",
              },
              Object {
                "arguments": Array [
                  Object {
                    "isQuoted": false,
                    "type": "literal",
                    "value": "actionTypeId",
                  },
                  Object {
                    "isQuoted": true,
                    "type": "literal",
                    "value": ".email",
                  },
                ],
                "function": "is",
                "type": "function",
              },
            ],
            "function": "nested",
            "type": "function",
          },
          Object {
            "arguments": Array [
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": "alert.attributes.enabled",
              },
              Object {
                "isQuoted": false,
                "type": "literal",
                "value": true,
              },
            ],
            "function": "is",
            "type": "function",
          },
        ],
        "function": "and",
        "type": "function",
      }
    `);
  });

  test('validate a NON valid kuery node', () => {
    const astFilter = fromKueryExpression('tags: "fast" and foo: "bar"');

    expect(() =>
      validateFieldsKueryNode({
        astFilter,
        suggestionsAbstraction: TestSuggestionsAbstractions,
      })
    ).toThrowErrorMatchingInlineSnapshot(`"Filter is not supported on this field \\"foo\\""`);
  });
});
