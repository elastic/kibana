/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { detectRegexEntities } from './detect_regex_entities';
import { getEntityHash } from './get_entity_hash';
import { RegexAnonymizationRule } from '../../../common/types';

describe('getEntityHash', () => {
  it('returns the same hash for differently cased emails when normalize=true', () => {
    const lower = getEntityHash('KATY@GMAIL.COM', 'EMAIL', true);
    const upper = getEntityHash('katy@gmail.com', 'EMAIL', true);
    expect(lower).toEqual(upper);
  });

  it('returns different hashes for differently cased emails when normalize=false', () => {
    const lower = getEntityHash('KATY@GMAIL.COM', 'EMAIL');
    const upper = getEntityHash('katy@gmail.com', 'EMAIL');
    expect(lower).not.toEqual(upper);
  });

  it('defaults normalize=false when not passed', () => {
    const withExplicitFalse = getEntityHash('Test', 'CUSTOM');
    const withDefault = getEntityHash('Test', 'CUSTOM');
    expect(withExplicitFalse).toEqual(withDefault);
  });
});

describe('detectRegexEntities', () => {
  // Mock logger
  const mockLogger = {
    error: jest.fn(),
  } as any;

  // Test rules - similar to what would be in the anonymization.spec.ts
  const testRules: RegexAnonymizationRule[] = [
    {
      entityClass: 'EMAIL',
      type: 'regex',
      pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
      enabled: true,
    },
    {
      entityClass: 'URL',
      type: 'regex',
      pattern: '\\bhttps?://[^\\s]+\\b',
      enabled: true,
    },
    {
      entityClass: 'IP',
      type: 'regex',
      pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
      enabled: true,
    },
  ];

  it('detects and hashes an email address', () => {
    const content = 'Contact me at TEST@Example.Com';
    const entities = detectRegexEntities(content, testRules, mockLogger);
    expect(entities).toHaveLength(1);
    expect(entities[0].entity).toBe('TEST@Example.Com');
    expect(entities[0].class_name).toBe('EMAIL');

    const expectedHash = getEntityHash('TEST@Example.Com', 'EMAIL');
    expect(entities[0].hash).toBe(expectedHash);
  });

  it('detects URL, IP, and email all in one string', () => {
    const content =
      'Check https://kibana.elastic.co, reach me at user@elastic.co, or ping 192.168.1.1';
    const entities = detectRegexEntities(content, testRules, mockLogger);

    const classes = entities.map((e) => e.class_name);
    expect(classes).toContain('URL');
    expect(classes).toContain('EMAIL');
    expect(classes).toContain('IP');
  });

  it('computes correct start and end positions', () => {
    const content = 'Email: hello@example.com';
    const entities = detectRegexEntities(content, testRules, mockLogger);
    const emailEntity = entities.find((e) => e.class_name === 'EMAIL');
    expect(emailEntity).toBeDefined();
    expect(content.slice(emailEntity!.start_pos, emailEntity!.end_pos)).toBe(emailEntity!.entity);
  });
});
