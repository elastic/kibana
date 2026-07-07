/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  updateYamlFieldDefault,
  removeYamlFieldDefault,
  hasFieldDefault,
} from './update_yaml_field_default';

describe('updateYamlFieldDefault', () => {
  const baseYaml = `name: Test Template
description: A test template
fields:
  - name: summary
    control: INPUT_TEXT
    type: keyword
    label: Summary
  - name: priority
    control: SELECT_BASIC
    type: keyword
    label: Priority
    metadata:
      options:
        - low
        - medium
        - high
`;

  it('should add metadata.default to a field that has no metadata', () => {
    const result = updateYamlFieldDefault(baseYaml, 'summary', 'Default summary');

    expect(result).toContain('default: Default summary');
  });

  it('should add default to a field that has metadata but no default', () => {
    const result = updateYamlFieldDefault(baseYaml, 'priority', 'medium');

    expect(result).toContain('default: medium');
  });

  it('should update existing metadata.default value', () => {
    const yamlWithDefault = `name: Test Template
fields:
  - name: summary
    control: INPUT_TEXT
    type: keyword
    metadata:
      default: Old value
`;

    const result = updateYamlFieldDefault(yamlWithDefault, 'summary', 'New value');

    expect(result).toContain('default: New value');
    expect(result).not.toContain('Old value');
  });

  it('should handle empty string values', () => {
    const result = updateYamlFieldDefault(baseYaml, 'summary', '');

    expect(result).toContain('default: ""');
  });

  it('should handle numeric values', () => {
    const numericYaml = `name: Test
fields:
  - name: count
    control: INPUT_NUMBER
    type: long
`;

    const result = updateYamlFieldDefault(numericYaml, 'count', 42);

    expect(result).toContain('default: 42');
  });

  it('should handle array values as a YAML sequence', () => {
    const checkboxYaml = `name: Test
fields:
  - name: affected_systems
    control: CHECKBOX_GROUP
    type: keyword
    metadata:
      options:
        - frontend
        - backend
`;

    const result = updateYamlFieldDefault(checkboxYaml, 'affected_systems', [
      'frontend',
      'backend',
    ]);

    expect(result).toContain('default:');
    expect(result).toContain('- frontend');
    expect(result).toContain('- backend');
    expect(result).not.toContain('["frontend","backend"]');
  });

  it('should update existing array default with new array value', () => {
    const yamlWithArrayDefault = `name: Test
fields:
  - name: affected_systems
    control: CHECKBOX_GROUP
    type: keyword
    metadata:
      options:
        - frontend
        - backend
        - database
      default:
        - frontend
`;

    const result = updateYamlFieldDefault(yamlWithArrayDefault, 'affected_systems', [
      'frontend',
      'database',
    ]);

    // default section contains only frontend and database
    const defaultMatch = result.match(/default:\n((?:\s+- .+\n?)+)/);
    expect(defaultMatch).not.toBeNull();
    const defaultBlock = defaultMatch![1];
    expect(defaultBlock).toContain('frontend');
    expect(defaultBlock).toContain('database');
    expect(defaultBlock).not.toContain('backend');
  });

  it('should handle an empty array value', () => {
    const checkboxYaml = `name: Test
fields:
  - name: tags
    control: CHECKBOX_GROUP
    type: keyword
    metadata:
      options:
        - a
        - b
      default:
        - a
`;

    const result = updateYamlFieldDefault(checkboxYaml, 'tags', []);

    // yaml library serialises [] as an inline empty sequence
    expect(result).toContain('default: []');
  });

  it('should handle a single-element array', () => {
    const checkboxYaml = `name: Test
fields:
  - name: tags
    control: CHECKBOX_GROUP
    type: keyword
    metadata:
      options:
        - a
        - b
`;

    const result = updateYamlFieldDefault(checkboxYaml, 'tags', ['b']);

    expect(result).toContain('- b');
    expect(result).not.toContain('["b"]');
  });

  it('should handle array items that contain special characters', () => {
    const checkboxYaml = `name: Test
fields:
  - name: systems
    control: CHECKBOX_GROUP
    type: keyword
    metadata:
      options:
        - "key: value"
        - "with spaces"
`;

    const result = updateYamlFieldDefault(checkboxYaml, 'systems', ['key: value', 'with spaces']);

    expect(result).toContain('key: value');
    expect(result).toContain('with spaces');
    expect(result).not.toContain('["key: value","with spaces"]');
  });

  it('should replace a scalar default with an array', () => {
    const yamlWithScalarDefault = `name: Test
fields:
  - name: systems
    control: CHECKBOX_GROUP
    type: keyword
    metadata:
      default: old-string-value
`;

    const result = updateYamlFieldDefault(yamlWithScalarDefault, 'systems', ['a', 'b']);

    expect(result).not.toContain('old-string-value');
    expect(result).toContain('- a');
    expect(result).toContain('- b');
  });

  it('should replace an array default with a scalar string', () => {
    const yamlWithArrayDefault = `name: Test
fields:
  - name: priority
    control: SELECT_BASIC
    type: keyword
    metadata:
      default:
        - low
        - medium
`;

    const result = updateYamlFieldDefault(yamlWithArrayDefault, 'priority', 'high');

    expect(result).toContain('default: high');
    expect(result).not.toContain('- low');
    expect(result).not.toContain('- medium');
  });

  it('should preserve options and other metadata keys when updating array default', () => {
    const checkboxYaml = `name: Test
fields:
  - name: systems
    control: CHECKBOX_GROUP
    type: keyword
    metadata:
      options:
        - api
        - ui
        - database
`;

    const result = updateYamlFieldDefault(checkboxYaml, 'systems', ['api', 'database']);

    expect(result).toContain('- api');
    expect(result).toContain('- ui');
    expect(result).toContain('- database');
    expect(result).toContain('default:');
  });

  it('should return original yaml if field not found', () => {
    const result = updateYamlFieldDefault(baseYaml, 'nonexistent', 'value');

    expect(result).toBe(baseYaml);
  });

  it('should return original yaml if yaml is empty', () => {
    const result = updateYamlFieldDefault('', 'summary', 'value');

    expect(result).toBe('');
  });

  it('should return original yaml if yaml is whitespace only', () => {
    const result = updateYamlFieldDefault('   ', 'summary', 'value');

    expect(result).toBe('   ');
  });

  it('should return original yaml if parsing fails', () => {
    const invalidYaml = 'invalid: yaml: content: [';

    const result = updateYamlFieldDefault(invalidYaml, 'summary', 'value');

    expect(result).toBe(invalidYaml);
  });

  it('should return original yaml if fields array is missing', () => {
    const noFieldsYaml = `name: Test
description: No fields
`;

    const result = updateYamlFieldDefault(noFieldsYaml, 'summary', 'value');

    expect(result).toBe(noFieldsYaml);
  });

  it('should preserve other field properties when adding default', () => {
    const result = updateYamlFieldDefault(baseYaml, 'summary', 'test');

    expect(result).toContain('name: summary');
    expect(result).toContain('control: INPUT_TEXT');
    expect(result).toContain('type: keyword');
    expect(result).toContain('label: Summary');
  });

  it('should preserve other metadata properties when adding default', () => {
    const result = updateYamlFieldDefault(baseYaml, 'priority', 'high');

    expect(result).toContain('options:');
    expect(result).toContain('- low');
    expect(result).toContain('- medium');
    expect(result).toContain('- high');
    expect(result).toContain('default: high');
  });

  it('should handle special characters in values', () => {
    const result = updateYamlFieldDefault(baseYaml, 'summary', 'Value with "quotes" and: colons');

    expect(result).toContain('default:');
  });

  it('should preserve comments in the YAML', () => {
    const yamlWithComments = `# Template header comment
name: Test Template
description: A test template # inline comment
fields:
  # Field comment
  - name: summary
    control: INPUT_TEXT
    type: keyword
    label: Summary # label comment
  - name: priority
    control: SELECT_BASIC
    type: keyword
    metadata:
      options:
        - low
        - high
`;

    const result = updateYamlFieldDefault(yamlWithComments, 'summary', 'test value');

    expect(result).toContain('# Template header comment');
    expect(result).toContain('# inline comment');
    expect(result).toContain('# Field comment');
    expect(result).toContain('# label comment');
    expect(result).toContain('default: test value');
  });

  it('should preserve inline comment on existing default line', () => {
    const yamlWithInlineComment = `name: Test
fields:
  - name: summary
    control: INPUT_TEXT
    type: keyword
    metadata:
      default: old value # important comment
`;

    const result = updateYamlFieldDefault(yamlWithInlineComment, 'summary', 'new value');

    expect(result).toContain('default: new value # important comment');
    expect(result).not.toContain('old value');
  });

  describe('$ref entries', () => {
    it('adds metadata.default to a $ref entry matched by its $ref name', () => {
      const yaml = `name: T
fields:
  - $ref: my_field
`;
      const result = updateYamlFieldDefault(yaml, 'my_field', 'hello');
      expect(result).toContain('$ref: my_field');
      expect(result).toContain('metadata:');
      expect(result).toContain('default: hello');
    });

    it('adds metadata.default to a $ref entry matched by its alias name', () => {
      const yaml = `name: T
fields:
  - name: my_alias
    $ref: my_field
`;
      const result = updateYamlFieldDefault(yaml, 'my_alias', 'hello');
      expect(result).toContain('default: hello');
      // Untouched ref should remain
      expect(result).toContain('$ref: my_field');
    });

    it('updates an existing metadata.default on a $ref entry', () => {
      const yaml = `name: T
fields:
  - $ref: my_field
    metadata:
      default: old
`;
      const result = updateYamlFieldDefault(yaml, 'my_field', 'new');
      expect(result).toContain('default: new');
      expect(result).not.toContain('default: old');
    });

    it('does not match a $ref entry by its raw $ref when an alias is set', () => {
      const yaml = `name: T
fields:
  - name: my_alias
    $ref: my_field
`;
      // Effective name is `my_alias`; `my_field` should not match.
      const result = updateYamlFieldDefault(yaml, 'my_field', 'hello');
      expect(result).toBe(yaml);
    });
  });
});

describe('removeYamlFieldDefault', () => {
  const baseYaml = `name: Test Template
fields:
  - name: assignee
    control: USER_PICKER
    type: keyword
    metadata:
      multiple: true
      default:
        - uid: uid-1
          name: Alice
`;

  it('removes default from metadata, leaves other metadata keys intact', () => {
    const result = removeYamlFieldDefault(baseYaml, 'assignee');

    expect(result).toContain('multiple: true');
    expect(result).not.toContain('default:');
    expect(result).not.toContain('uid-1');
  });

  it('removes entire metadata block when default was the only key', () => {
    const yaml = `name: Test
fields:
  - name: assignee
    control: USER_PICKER
    type: keyword
    metadata:
      default:
        - uid: uid-1
          name: Alice
`;

    const result = removeYamlFieldDefault(yaml, 'assignee');

    expect(result).not.toContain('metadata:');
    expect(result).not.toContain('default:');
  });

  it('returns yaml unchanged when field does not exist', () => {
    const result = removeYamlFieldDefault(baseYaml, 'nonexistent');

    expect(result).toBe(baseYaml);
  });

  it('returns yaml unchanged when field has no metadata', () => {
    const yaml = `name: Test
fields:
  - name: assignee
    control: USER_PICKER
    type: keyword
`;

    const result = removeYamlFieldDefault(yaml, 'assignee');

    expect(result).toBe(yaml);
  });

  it('returns yaml unchanged when metadata has no default key', () => {
    const yaml = `name: Test
fields:
  - name: assignee
    control: USER_PICKER
    type: keyword
    metadata:
      multiple: true
`;

    const result = removeYamlFieldDefault(yaml, 'assignee');

    expect(result).toContain('multiple: true');
    expect(result).not.toContain('default:');
  });

  it('returns original yaml for empty input', () => {
    expect(removeYamlFieldDefault('', 'assignee')).toBe('');
  });

  it('returns original yaml for whitespace-only input', () => {
    expect(removeYamlFieldDefault('   ', 'assignee')).toBe('   ');
  });

  it('returns original yaml when parsing fails', () => {
    const invalidYaml = 'invalid: yaml: [broken';

    expect(removeYamlFieldDefault(invalidYaml, 'assignee')).toBe(invalidYaml);
  });

  it('does not affect other fields in the document', () => {
    const yaml = `name: Test
fields:
  - name: assignee
    control: USER_PICKER
    type: keyword
    metadata:
      default:
        - uid: uid-1
          name: Alice
  - name: summary
    control: INPUT_TEXT
    type: keyword
    metadata:
      default: My summary
`;

    const result = removeYamlFieldDefault(yaml, 'assignee');

    expect(result).not.toContain('uid-1');
    expect(result).toContain('default: My summary');
  });

  it('preserves comments in the yaml', () => {
    const yaml = `# Template header
name: Test
fields:
  # field comment
  - name: assignee
    control: USER_PICKER
    type: keyword
    metadata:
      default:
        - uid: uid-1
          name: Alice
`;

    const result = removeYamlFieldDefault(yaml, 'assignee');

    expect(result).toContain('# Template header');
    expect(result).toContain('# field comment');
    expect(result).not.toContain('default:');
  });

  describe('$ref entries', () => {
    it('removes metadata.default from a $ref entry matched by $ref name', () => {
      const yaml = `name: T
fields:
  - $ref: my_field
    metadata:
      default: hello
`;
      const result = removeYamlFieldDefault(yaml, 'my_field');
      expect(result).toContain('$ref: my_field');
      expect(result).not.toContain('default:');
    });

    it('removes metadata.default from a $ref entry matched by alias name', () => {
      const yaml = `name: T
fields:
  - name: my_alias
    $ref: my_field
    metadata:
      default: hello
`;
      const result = removeYamlFieldDefault(yaml, 'my_alias');
      expect(result).not.toContain('default:');
      expect(result).toContain('$ref: my_field');
    });
  });
});

describe('hasFieldDefault', () => {
  it('should return true when field has metadata.default', () => {
    const yaml = `name: Test
fields:
  - name: summary
    control: INPUT_TEXT
    type: keyword
    metadata:
      default: Some value
`;

    expect(hasFieldDefault(yaml, 'summary')).toBe(true);
  });

  it('should return false when field has no metadata', () => {
    const yaml = `name: Test
fields:
  - name: summary
    control: INPUT_TEXT
    type: keyword
`;

    expect(hasFieldDefault(yaml, 'summary')).toBe(false);
  });

  it('should return false when field has metadata but no default', () => {
    const yaml = `name: Test
fields:
  - name: priority
    control: SELECT_BASIC
    type: keyword
    metadata:
      options:
        - low
        - high
`;

    expect(hasFieldDefault(yaml, 'priority')).toBe(false);
  });

  it('should return false when field does not exist', () => {
    const yaml = `name: Test
fields:
  - name: summary
    control: INPUT_TEXT
    type: keyword
`;

    expect(hasFieldDefault(yaml, 'nonexistent')).toBe(false);
  });

  it('should return false for empty yaml', () => {
    expect(hasFieldDefault('', 'summary')).toBe(false);
  });

  it('should return false for invalid yaml', () => {
    expect(hasFieldDefault('invalid: [yaml', 'summary')).toBe(false);
  });

  it('should return false when fields array is missing', () => {
    const yaml = `name: Test
description: No fields
`;

    expect(hasFieldDefault(yaml, 'summary')).toBe(false);
  });

  it('should return true for empty string default value', () => {
    const yaml = `name: Test
fields:
  - name: summary
    control: INPUT_TEXT
    type: keyword
    metadata:
      default: ""
`;

    expect(hasFieldDefault(yaml, 'summary')).toBe(true);
  });

  it('should return true for numeric default value of 0', () => {
    const yaml = `name: Test
fields:
  - name: count
    control: INPUT_NUMBER
    type: long
    metadata:
      default: 0
`;

    expect(hasFieldDefault(yaml, 'count')).toBe(true);
  });

  it('should return true when field has an array default', () => {
    const yaml = `name: Test
fields:
  - name: systems
    control: CHECKBOX_GROUP
    type: keyword
    metadata:
      options:
        - api
        - ui
      default:
        - api
`;

    expect(hasFieldDefault(yaml, 'systems')).toBe(true);
  });

  it('should return true when field has an empty array default', () => {
    const yaml = `name: Test
fields:
  - name: systems
    control: CHECKBOX_GROUP
    type: keyword
    metadata:
      options:
        - api
      default: []
`;

    expect(hasFieldDefault(yaml, 'systems')).toBe(true);
  });

  describe('$ref entries', () => {
    it('returns true for a $ref entry with metadata.default matched by $ref name', () => {
      const yaml = `name: T
fields:
  - $ref: my_field
    metadata:
      default: hello
`;
      expect(hasFieldDefault(yaml, 'my_field')).toBe(true);
    });

    it('returns false for a $ref entry without metadata.default', () => {
      const yaml = `name: T
fields:
  - $ref: my_field
`;
      expect(hasFieldDefault(yaml, 'my_field')).toBe(false);
    });

    it('matches by alias name when set on the $ref entry', () => {
      const yaml = `name: T
fields:
  - name: my_alias
    $ref: my_field
    metadata:
      default: hello
`;
      expect(hasFieldDefault(yaml, 'my_alias')).toBe(true);
      expect(hasFieldDefault(yaml, 'my_field')).toBe(false);
    });
  });
});
