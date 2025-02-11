/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyword } from './mappings';

describe('mappings', () => {
  describe('keyword', () => {
    it('should set ignore_above:1024 by default for indexed field', () => {
      const mappings = keyword({
        name: 'test',
        type: 'keyword',
      });

      expect(mappings).toEqual({
        ignore_above: 1024,
        type: 'keyword',
      });
    });

    it('should not set ignore_above for non indexed field', () => {
      const mappings = keyword({
        name: 'test',
        type: 'keyword',
        index: false,
      });

      expect(mappings).toEqual({
        type: 'keyword',
        index: false,
      });
    });

    it('should not set ignore_above field with doc_values:false', () => {
      const mappings = keyword({
        name: 'test',
        type: 'keyword',
        doc_values: false,
      });

      expect(mappings).toEqual({
        type: 'keyword',
        doc_values: false,
      });
    });
  });
});
