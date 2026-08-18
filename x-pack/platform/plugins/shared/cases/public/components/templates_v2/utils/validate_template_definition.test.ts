/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getMissingRequiredKeys,
  validateTemplateDefinitionYaml,
} from './validate_template_definition';

// A complete definition contains every render-panel-controlled block. Case-default values may be
// empty, but the keys must be present.
const COMPLETE_DEFINITION = `name: Case default title
description: ""
severity: low
category: ""
tags: []
assignees: []
settings:
  syncAlerts: false
  extractObservables: false
connector:
  type: .none
  id: none
  fields: null
fields:
  - name: effort
    control: INPUT_NUMBER
    label: Effort
    type: integer
`;

describe('validateTemplateDefinitionYaml', () => {
  it('accepts a complete template definition', () => {
    const result = validateTemplateDefinitionYaml(COMPLETE_DEFINITION);

    expect(result.success).toBe(true);
  });

  it('rejects invalid field type for control', () => {
    const result = validateTemplateDefinitionYaml(
      COMPLETE_DEFINITION.replace('type: integer', 'type: keyword')
    );

    expect(result.success).toBe(false);
  });

  it('rejects invalid yaml syntax', () => {
    const result = validateTemplateDefinitionYaml('fields: [invalid yaml');

    expect(result.success).toBe(false);
  });

  it('accepts legacy top-level case defaults (title canonicalized to name)', () => {
    const result = validateTemplateDefinitionYaml(
      COMPLETE_DEFINITION.replace('name: Case default title', 'title: Legacy case title')
    );

    expect(result.success).toBe(true);
  });

  it('validates legacy top-level severity values against the case schema', () => {
    const result = validateTemplateDefinitionYaml(
      COMPLETE_DEFINITION.replace('severity: low', 'severity: urgent')
    );

    expect(result.success).toBe(false);
  });

  describe('completeness (editor-only)', () => {
    it('rejects a definition missing the fields block', () => {
      const withoutFields = COMPLETE_DEFINITION.replace(
        /fields:\n {2}- name: effort\n {4}control: INPUT_NUMBER\n {4}label: Effort\n {4}type: integer\n/,
        ''
      );
      const result = validateTemplateDefinitionYaml(withoutFields);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toContain('fields');
      }
    });

    it('tolerates a missing connector block (renderer-managed, never a blocker)', () => {
      const withoutConnector = COMPLETE_DEFINITION.replace(
        /connector:\n {2}type: .none\n {2}id: none\n {2}fields: null\n/,
        ''
      );

      expect(validateTemplateDefinitionYaml(withoutConnector).success).toBe(true);
    });

    it('tolerates a missing settings block (renderer-managed, never a blocker)', () => {
      const withoutSettings = COMPLETE_DEFINITION.replace(
        /settings:\n {2}syncAlerts: false\n {2}extractObservables: false\n/,
        ''
      );

      expect(validateTemplateDefinitionYaml(withoutSettings).success).toBe(true);
    });
  });
});

describe('getMissingRequiredKeys', () => {
  const completeObject = {
    name: 'Case title',
    severity: 'low',
    tags: [],
    assignees: [],
    settings: { syncAlerts: false, extractObservables: false },
    connector: { type: '.none', id: 'none', fields: null },
    fields: [],
  };

  it('returns no missing keys for a complete definition', () => {
    expect(getMissingRequiredKeys(completeObject)).toEqual([]);
  });

  it('reports no missing keys when the structural fields block is present (case defaults optional)', () => {
    const missing = getMissingRequiredKeys({
      fields: [],
    });

    // Every case default is optional now — only the `fields` block is required, and it is present.
    expect(missing).toEqual([]);
  });

  it('reports a missing fields block', () => {
    const { fields, ...withoutFields } = completeObject;
    expect(getMissingRequiredKeys(withoutFields)).toEqual(['fields']);
  });

  it('does not require the renderer-managed settings block', () => {
    const { settings, ...withoutSettings } = completeObject;
    expect(getMissingRequiredKeys(withoutSettings)).toEqual([]);
  });

  it('does not require the renderer-managed connector block', () => {
    const { connector, ...withoutConnector } = completeObject;
    expect(getMissingRequiredKeys(withoutConnector)).toEqual([]);
  });
});
