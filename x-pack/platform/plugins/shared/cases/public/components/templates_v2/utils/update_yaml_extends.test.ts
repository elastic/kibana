/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setYamlExtends, removeYamlExtends } from './update_yaml_extends';

const TEMPLATE_ID = 'abc-123';

describe('setYamlExtends', () => {
  it('sets extends on a document that has no extends key', () => {
    const yaml = `name: My Template\ndescription: A description\n`;

    const result = setYamlExtends(yaml, TEMPLATE_ID);

    expect(result).toContain(`extends: ${TEMPLATE_ID}`);
    expect(result).toContain('name: My Template');
  });

  it('overwrites an existing extends value', () => {
    const yaml = `name: My Template\nextends: old-id\n`;

    const result = setYamlExtends(yaml, TEMPLATE_ID);

    expect(result).toContain(`extends: ${TEMPLATE_ID}`);
    expect(result).not.toContain('old-id');
  });

  it('creates a minimal document when yaml is empty string', () => {
    const result = setYamlExtends('', TEMPLATE_ID);

    expect(result).toBe(`extends: ${TEMPLATE_ID}\n`);
  });

  it('creates a minimal document when yaml is whitespace only', () => {
    const result = setYamlExtends('   ', TEMPLATE_ID);

    expect(result).toBe(`extends: ${TEMPLATE_ID}\n`);
  });

  it('returns original yaml when parsing fails', () => {
    const invalidYaml = 'invalid: yaml: [broken';

    const result = setYamlExtends(invalidYaml, TEMPLATE_ID);

    expect(result).toBe(invalidYaml);
  });

  it('returns original yaml when document root is not a mapping', () => {
    const listYaml = '- item1\n- item2\n';

    const result = setYamlExtends(listYaml, TEMPLATE_ID);

    expect(result).toBe(listYaml);
  });

  it('preserves comments in the document', () => {
    const yaml = `# Template header\nname: My Template # inline\n`;

    const result = setYamlExtends(yaml, TEMPLATE_ID);

    expect(result).toContain('# Template header');
    expect(result).toContain('# inline');
    expect(result).toContain(`extends: ${TEMPLATE_ID}`);
  });

  it('preserves other fields in the document', () => {
    const yaml = `name: My Template\ndescription: A description\ntags:\n  - security\n`;

    const result = setYamlExtends(yaml, TEMPLATE_ID);

    expect(result).toContain('name: My Template');
    expect(result).toContain('description: A description');
    expect(result).toContain('- security');
    expect(result).toContain(`extends: ${TEMPLATE_ID}`);
  });
});

describe('removeYamlExtends', () => {
  it('removes the extends key from a document', () => {
    const yaml = `name: My Template\nextends: ${TEMPLATE_ID}\ndescription: A description\n`;

    const result = removeYamlExtends(yaml);

    expect(result).not.toContain('extends:');
    expect(result).toContain('name: My Template');
    expect(result).toContain('description: A description');
  });

  it('returns yaml unchanged when there is no extends key', () => {
    const yaml = `name: My Template\ndescription: A description\n`;

    const result = removeYamlExtends(yaml);

    expect(result).toBe(yaml);
  });

  it('returns original yaml when yaml is empty string', () => {
    expect(removeYamlExtends('')).toBe('');
  });

  it('returns original yaml when yaml is whitespace only', () => {
    expect(removeYamlExtends('   ')).toBe('   ');
  });

  it('returns original yaml when parsing fails', () => {
    const invalidYaml = 'invalid: yaml: [broken';

    expect(removeYamlExtends(invalidYaml)).toBe(invalidYaml);
  });

  it('returns original yaml when document root is not a mapping', () => {
    const listYaml = '- item1\n- item2\n';

    expect(removeYamlExtends(listYaml)).toBe(listYaml);
  });

  it('preserves comments in the document', () => {
    const yaml = `# Template header\nname: My Template\nextends: ${TEMPLATE_ID} # parent\n`;

    const result = removeYamlExtends(yaml);

    expect(result).toContain('# Template header');
    expect(result).not.toContain('extends:');
  });

  it('preserves other fields when removing extends', () => {
    const yaml = `name: My Template\nextends: ${TEMPLATE_ID}\ntags:\n  - security\n`;

    const result = removeYamlExtends(yaml);

    expect(result).toContain('name: My Template');
    expect(result).toContain('- security');
    expect(result).not.toContain('extends:');
  });
});
