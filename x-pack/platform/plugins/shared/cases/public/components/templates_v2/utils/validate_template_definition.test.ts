/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateTemplateDefinitionYaml } from './validate_template_definition';

describe('validateTemplateDefinitionYaml', () => {
  it('accepts a valid template definition', () => {
    const result = validateTemplateDefinitionYaml(`fields:
  - name: effort
    control: INPUT_NUMBER
    label: Effort
    type: integer
`);

    expect(result.success).toBe(true);
  });

  it('rejects invalid field type for control', () => {
    const result = validateTemplateDefinitionYaml(`fields:
  - name: effort
    control: INPUT_NUMBER
    label: Effort
    type: keyword
`);

    expect(result.success).toBe(false);
  });

  it('rejects invalid yaml syntax', () => {
    const result = validateTemplateDefinitionYaml('fields: [invalid yaml');

    expect(result.success).toBe(false);
  });

  it('accepts legacy top-level case defaults', () => {
    const result = validateTemplateDefinitionYaml(`name: Legacy case title
severity: medium
category: triage
fields: []`);

    expect(result.success).toBe(true);
  });

  it('validates legacy top-level severity values against the case schema', () => {
    const result = validateTemplateDefinitionYaml(`name: Legacy case title
severity: urgent
fields: []`);

    expect(result.success).toBe(false);
  });

  it('accepts template-prefixed metadata alongside case defaults', () => {
    const result = validateTemplateDefinitionYaml(`template_name: Security triage template
template_description: Used by SOC analysts
template_tags:
  - secops
name: Case default title
description: Case default description
tags:
  - case-tag
fields: []`);

    expect(result.success).toBe(true);
  });
});
