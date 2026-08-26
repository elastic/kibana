/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify as yamlStringify } from 'yaml';
import { validateTemplateDefinition, validateTemplateStructure } from './validate_template_input';

const buildDefinition = (fieldNames: string[]): string =>
  yamlStringify({
    name: 'A Template',
    fields: fieldNames.map((fieldName) => ({
      control: 'INPUT_TEXT',
      name: fieldName,
      type: 'keyword',
    })),
  });

describe('validateTemplateStructure', () => {
  it('accepts a structurally valid definition with an invalid (non-authorable) field name', () => {
    // Unlike validateTemplateDefinition, this never checks the authoring charset — UPDATE
    // routes rely on it, since only TemplatesService has the existing template needed to
    // grandfather legacy names.
    const result = validateTemplateStructure(buildDefinition(['legacy-field']));
    expect(result.valid).toBe(true);
  });

  it('rejects invalid YAML', () => {
    const result = validateTemplateStructure('not: valid: yaml: [');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('Invalid YAML definition');
    }
  });

  it('rejects a definition that fails the structural schema', () => {
    const result = validateTemplateStructure(yamlStringify({ fields: 'not-an-array' }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('Invalid template definition');
    }
  });
});

describe('validateTemplateDefinition', () => {
  it('accepts a definition with only authorable field names', () => {
    const result = validateTemplateDefinition(buildDefinition(['risk_score']));
    expect(result.valid).toBe(true);
  });

  it('rejects a definition with a non-authorable field name, naming the offending field', () => {
    const result = validateTemplateDefinition(buildDefinition(['bad name!']));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('bad name!');
    }
  });

  it('rejects invalid YAML the same way as validateTemplateStructure', () => {
    const result = validateTemplateDefinition('not: valid: yaml: [');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('Invalid YAML definition');
    }
  });
});
