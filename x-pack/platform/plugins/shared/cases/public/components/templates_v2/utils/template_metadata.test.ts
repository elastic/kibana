/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasTemplateMetadataErrors,
  normalizeTemplateMetadata,
  validateTemplateMetadata,
} from './template_metadata';

describe('template_metadata utils', () => {
  describe('normalizeTemplateMetadata', () => {
    it('trims strings and deduplicates tags', () => {
      expect(
        normalizeTemplateMetadata({
          name: '  My template  ',
          description: '  Useful defaults  ',
          tags: ['  secops ', 'secops', '', ' triage '],
        })
      ).toEqual({
        name: 'My template',
        description: 'Useful defaults',
        tags: ['secops', 'triage'],
      });
    });
  });

  describe('validateTemplateMetadata', () => {
    it('requires a non-empty name after normalization', () => {
      const errors = validateTemplateMetadata({
        name: '   ',
        description: '',
        tags: [],
      });

      expect(errors.name).toBeDefined();
      expect(hasTemplateMetadataErrors(errors)).toBe(true);
    });

    it('returns no errors for valid metadata', () => {
      const errors = validateTemplateMetadata({
        name: 'Ops response template',
        description: 'Applies default severity and connector.',
        tags: ['ops', 'response'],
      });

      expect(errors).toEqual({});
      expect(hasTemplateMetadataErrors(errors)).toBe(false);
    });
  });
});
