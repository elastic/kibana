/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBuiltinRules } from '.';
import { compileFormattingRules } from '../message';

const { format } = compileFormattingRules(
  getBuiltinRules(['first_generic_message', 'second_generic_message'])
);

describe('Generic Rules', () => {
  describe('configurable message rules', () => {
    test('includes the event.dataset and log.level if present', () => {
      const flattenedDocument = {
        '@timestamp': '2016-12-26T16:22:13.000Z',
        'event.dataset': 'generic.test',
        'log.level': 'TEST_LEVEL',
        first_generic_message: 'TEST_MESSAGE',
      };
      const highlights = {
        first_generic_message: ['TEST'],
      };

      expect(format(flattenedDocument, highlights)).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[",
  },
  Object {
    "field": "event.dataset",
    "highlights": Array [],
    "value": "generic.test",
  },
  Object {
    "constant": "][",
  },
  Object {
    "field": "log.level",
    "highlights": Array [],
    "value": "TEST_LEVEL",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "first_generic_message",
    "highlights": Array [
      "TEST",
    ],
    "value": "TEST_MESSAGE",
  },
]
`);
    });

    test('includes the log.level if present', () => {
      const flattenedDocument = {
        '@timestamp': '2016-12-26T16:22:13.000Z',
        'log.level': 'TEST_LEVEL',
        first_generic_message: 'TEST_MESSAGE',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[",
  },
  Object {
    "field": "log.level",
    "highlights": Array [],
    "value": "TEST_LEVEL",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "first_generic_message",
    "highlights": Array [],
    "value": "TEST_MESSAGE",
  },
]
`);
    });

    test('includes the message', () => {
      const firstFlattenedDocument = {
        '@timestamp': '2016-12-26T16:22:13.000Z',
        first_generic_message: 'FIRST_TEST_MESSAGE',
      };

      expect(format(firstFlattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "field": "first_generic_message",
    "highlights": Array [],
    "value": "FIRST_TEST_MESSAGE",
  },
]
`);

      const secondFlattenedDocument = {
        '@timestamp': '2016-12-26T16:22:13.000Z',
        second_generic_message: 'SECOND_TEST_MESSAGE',
      };

      expect(format(secondFlattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "field": "second_generic_message",
    "highlights": Array [],
    "value": "SECOND_TEST_MESSAGE",
  },
]
`);
    });
  });

  describe('log.original fallback', () => {
    test('includes the event.dataset if present', () => {
      const flattenedDocument = {
        '@timestamp': '2016-12-26T16:22:13.000Z',
        'event.dataset': 'generic.test',
        'log.original': 'TEST_MESSAGE',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[",
  },
  Object {
    "field": "event.dataset",
    "highlights": Array [],
    "value": "generic.test",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "log.original",
    "highlights": Array [],
    "value": "TEST_MESSAGE",
  },
]
`);
    });

    test('includes the original message', () => {
      const flattenedDocument = {
        '@timestamp': '2016-12-26T16:22:13.000Z',
        'log.original': 'TEST_MESSAGE',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "field": "log.original",
    "highlights": Array [],
    "value": "TEST_MESSAGE",
  },
]
`);
    });
  });
});
