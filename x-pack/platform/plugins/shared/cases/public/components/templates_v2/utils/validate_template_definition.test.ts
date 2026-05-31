/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateTemplateDefinitionYaml } from './validate_template_definition';

describe('validateTemplateDefinitionYaml', () => {
  it('accepts a valid template definition', () => {
    const result = validateTemplateDefinitionYaml(`name: Test template
fields:
  - name: effort
    control: INPUT_NUMBER
    label: Effort
    type: integer
`);

    expect(result.success).toBe(true);
  });

  it('rejects invalid field type for control', () => {
    const result = validateTemplateDefinitionYaml(`name: Test template
fields:
  - name: effort
    control: INPUT_NUMBER
    label: Effort
    type: keyword
`);

    expect(result.success).toBe(false);
  });

  it('rejects invalid yaml syntax', () => {
    const result = validateTemplateDefinitionYaml('name: [invalid yaml');

    expect(result.success).toBe(false);
  });
});
