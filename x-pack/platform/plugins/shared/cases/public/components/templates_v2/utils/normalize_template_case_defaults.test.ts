/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as yamlParse } from 'yaml';
import {
  normalizeTemplateCaseDefaultsForValidation,
  normalizeTemplateCaseDefaultsYaml,
} from './normalize_template_case_defaults';

describe('normalize_template_case_defaults', () => {
  describe('normalizeTemplateCaseDefaultsForValidation', () => {
    it('maps legacy top-level title into name', () => {
      expect(
        normalizeTemplateCaseDefaultsForValidation({
          title: 'Legacy title',
          description: 'Legacy description',
          severity: 'high',
          category: 'security',
          tags: ['triage'],
          fields: [],
        })
      ).toEqual({
        name: 'Legacy title',
        description: 'Legacy description',
        severity: 'high',
        category: 'security',
        tags: ['triage'],
        fields: [],
      });
    });
  });

  describe('normalizeTemplateCaseDefaultsYaml', () => {
    it('renames top-level title to name', () => {
      const normalized = normalizeTemplateCaseDefaultsYaml(`title: Legacy title
description: Legacy description
severity: medium
fields: []`);

      const parsed = yamlParse(normalized) as Record<string, unknown>;
      expect(parsed).toMatchObject({
        name: 'Legacy title',
        description: 'Legacy description',
        severity: 'medium',
      });
      expect(parsed).not.toHaveProperty('title');
    });
  });
});
