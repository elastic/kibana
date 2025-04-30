/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHashedEntity, getRegexEntities } from './get_regex_entities';

describe('getHashedEntity', () => {
  it('returns the same hash for differently cased emails when normalize=true', () => {
    const lower = getHashedEntity('KATY@GMAIL.COM', 'EMAIL', true);
    const upper = getHashedEntity('katy@gmail.com', 'EMAIL', true);
    expect(lower).toEqual(upper);
  });

  it('returns different hashes for differently cased emails when normalize=false', () => {
    const lower = getHashedEntity('KATY@GMAIL.COM', 'EMAIL', false);
    const upper = getHashedEntity('katy@gmail.com', 'EMAIL', false);
    expect(lower).not.toEqual(upper);
  });

  it('defaults normalize=false when not passed', () => {
    const withExplicitFalse = getHashedEntity('Test', 'CUSTOM', false);
    const withDefault = getHashedEntity('Test', 'CUSTOM');
    expect(withExplicitFalse).toEqual(withDefault);
  });
});

describe('getRegexEntities', () => {
  it('detects and hashes an email address', () => {
    const content = 'Contact me at TEST@Example.Com';
    const entities = getRegexEntities(content);
    expect(entities).toHaveLength(1);
    expect(entities[0].entity).toBe('TEST@Example.Com');
    expect(entities[0].class_name).toBe('EMAIL');

    // Confirm normalization by comparing hash to expected
    const expectedHash = getHashedEntity('test@example.com', 'EMAIL');
    expect(entities[0].hash).toBe(expectedHash);
  });

  it('detects URL, IP, and email all in one string', () => {
    const content =
      'Check https://kibana.elastic.co, reach me at user@elastic.co, or ping 192.168.1.1';
    const entities = getRegexEntities(content);

    const classes = entities.map((e) => e.class_name);
    expect(classes).toContain('URL');
    expect(classes).toContain('EMAIL');
    expect(classes).toContain('IP');
  });

  it('computes correct start and end positions', () => {
    const content = 'Email: hello@example.com';
    const entities = getRegexEntities(content);
    const emailEntity = entities.find((e) => e.class_name === 'EMAIL');
    expect(emailEntity).toBeDefined();
    expect(content.slice(emailEntity!.start_pos, emailEntity!.end_pos)).toBe(emailEntity!.entity);
  });
});
