/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillName, validateDomain, toSnakeCase, toCamelCase, toPascalCase } from './utils';

describe('validateSkillName', () => {
  it('accepts valid names', () => {
    expect(() => validateSkillName('alert-triage')).not.toThrow();
    expect(() => validateSkillName('log_analysis')).not.toThrow();
    expect(() => validateSkillName('my-skill-123')).not.toThrow();
  });

  it('rejects empty names', () => {
    expect(() => validateSkillName('')).toThrow('Skill name is required');
  });

  it('rejects names with invalid characters', () => {
    expect(() => validateSkillName('Alert Triage')).toThrow(
      'must contain only lowercase letters'
    );
    expect(() => validateSkillName('alert.triage')).toThrow(
      'must contain only lowercase letters'
    );
  });

  it('rejects names exceeding max length', () => {
    const longName = 'a'.repeat(65);
    expect(() => validateSkillName(longName)).toThrow('at most 64 characters');
  });
});

describe('validateDomain', () => {
  it('accepts valid domains', () => {
    expect(() => validateDomain('security')).not.toThrow();
    expect(() => validateDomain('observability')).not.toThrow();
    expect(() => validateDomain('platform')).not.toThrow();
    expect(() => validateDomain('search')).not.toThrow();
  });

  it('rejects invalid domains', () => {
    expect(() => validateDomain('unknown')).toThrow('Invalid domain');
  });
});

describe('toSnakeCase', () => {
  it('converts hyphenated names', () => {
    expect(toSnakeCase('alert-triage')).toBe('alert_triage');
    expect(toSnakeCase('my-long-name')).toBe('my_long_name');
  });

  it('preserves underscored names', () => {
    expect(toSnakeCase('alert_triage')).toBe('alert_triage');
  });
});

describe('toCamelCase', () => {
  it('converts hyphenated names', () => {
    expect(toCamelCase('alert-triage')).toBe('alertTriage');
    expect(toCamelCase('my-long-name')).toBe('myLongName');
  });

  it('converts underscored names', () => {
    expect(toCamelCase('alert_triage')).toBe('alertTriage');
  });
});

describe('toPascalCase', () => {
  it('converts hyphenated names', () => {
    expect(toPascalCase('alert-triage')).toBe('AlertTriage');
    expect(toPascalCase('my-long-name')).toBe('MyLongName');
  });
});
