/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serialize } from './serialize';

describe('serialize()', () => {
  describe('WHEN serializing a fail processor', () => {
    it('SHOULD preserve the configured message', () => {
      expect(
        serialize({
          pipeline: {
            processors: [
              {
                id: 'fail-processor',
                type: 'fail',
                options: { message: 'Test Error Message' },
              },
            ],
          },
        }).processors
      ).toEqual([
        {
          fail: {
            message: 'Test Error Message',
          },
        },
      ]);
    });
  });

  describe('WHEN serializing a foreach processor', () => {
    it('SHOULD serialize only the field when no processor is configured', () => {
      expect(
        serialize({
          pipeline: {
            processors: [
              {
                id: 'foreach-processor',
                type: 'foreach',
                options: { field: 'test_foreach_processor' },
              },
            ],
          },
        }).processors
      ).toEqual([
        {
          foreach: {
            field: 'test_foreach_processor',
          },
        },
      ]);
    });

    it('SHOULD parse a processor sub-pipeline that contains escaped characters', () => {
      expect(
        serialize({
          pipeline: {
            processors: [
              {
                id: 'foreach-processor',
                type: 'foreach',
                options: {
                  field: 'test_foreach_processor',
                  processor: '{"def_1":"""aaa"bbb""", "def_2":"aaa(bbb"}',
                },
              },
            ],
          },
        }).processors
      ).toEqual([
        {
          foreach: {
            field: 'test_foreach_processor',
            processor: { def_1: 'aaa"bbb', def_2: 'aaa(bbb' },
          },
        },
      ]);
    });
  });
});
