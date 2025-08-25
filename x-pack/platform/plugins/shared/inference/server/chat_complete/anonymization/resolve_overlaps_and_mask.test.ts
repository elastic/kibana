/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexAnonymizationRule } from '@kbn/inference-common';
import { resolveOverlapsAndMask } from './resolve_overlaps_and_mask';
import type { AnonymizationState } from './types';
import { getEntityMask } from './get_entity_mask';

describe('processMatches', () => {
  const emailRule: RegexAnonymizationRule = {
    type: 'RegExp',
    enabled: true,
    entityClass: 'EMAIL',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  };

  const phoneRule: RegexAnonymizationRule = {
    type: 'RegExp',
    enabled: true,
    entityClass: 'PHONE',
    pattern: '\\d{3}-\\d{3}-\\d{4}',
  };

  const domainRule: RegexAnonymizationRule = {
    type: 'RegExp',
    enabled: true,
    entityClass: 'DOMAIN',
    pattern: '[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  };

  const createInitialState = (records: Array<Record<string, string>>): AnonymizationState => ({
    records,
    anonymizations: [],
  });

  const createEmailMatch = (
    recordIndex: number,
    recordKey: string,
    start: number,
    value: string,
    ruleIndex = 0
  ) => ({
    recordIndex,
    recordKey,
    start,
    end: start + value.length,
    matchValue: value,
    class_name: 'EMAIL',
    ruleIndex,
  });

  const createPhoneMatch = (
    recordIndex: number,
    recordKey: string,
    start: number,
    value: string,
    ruleIndex = 1
  ) => ({
    recordIndex,
    recordKey,
    start,
    end: start + value.length,
    matchValue: value,
    class_name: 'PHONE',
    ruleIndex,
  });

  const createDomainMatch = (
    recordIndex: number,
    recordKey: string,
    start: number,
    value: string,
    ruleIndex = 1
  ) => ({
    recordIndex,
    recordKey,
    start,
    end: start + value.length,
    matchValue: value,
    class_name: 'DOMAIN',
    ruleIndex,
  });

  it('processes single match correctly', () => {
    const state = createInitialState([{ content: 'Email carlos@test.com for help' }]);
    const detectedMatches = [createEmailMatch(0, 'content', 6, 'carlos@test.com')];

    const result = resolveOverlapsAndMask({ detectedMatches, state, rules: [emailRule] });

    const expectedMask = getEntityMask({ value: 'carlos@test.com', class_name: 'EMAIL' });
    expect(result.records[0].content).toBe(`Email ${expectedMask} for help`);
    expect(result.anonymizations).toHaveLength(1);
    expect(result.anonymizations[0]).toEqual({
      rule: { type: 'RegExp' },
      entity: { value: 'carlos@test.com', class_name: 'EMAIL', mask: expectedMask },
    });
  });

  it('processes multiple matches in same field', () => {
    const state = createInitialState([{ content: 'Email carlos@test.com or call 555-123-4567' }]);
    const detectedMatches = [
      createEmailMatch(0, 'content', 6, 'carlos@test.com'),
      createPhoneMatch(0, 'content', 30, '555-123-4567'),
    ];

    const result = resolveOverlapsAndMask({
      detectedMatches,
      state,
      rules: [emailRule, phoneRule],
    });

    const emailMask = getEntityMask({ value: 'carlos@test.com', class_name: 'EMAIL' });
    const phoneMask = getEntityMask({ value: '555-123-4567', class_name: 'PHONE' });
    expect(result.records[0].content).toBe(`Email ${emailMask} or call ${phoneMask}`);
    expect(result.anonymizations).toHaveLength(2);
    expect(result.anonymizations[0]).toEqual({
      rule: { type: 'RegExp' },
      entity: { value: 'carlos@test.com', class_name: 'EMAIL', mask: emailMask },
    });
    expect(result.anonymizations[1]).toEqual({
      rule: { type: 'RegExp' },
      entity: { value: '555-123-4567', class_name: 'PHONE', mask: phoneMask },
    });
  });

  it('processes matches across multiple records and fields', () => {
    const state = createInitialState([
      { content: 'Email: maria@test.com', data: 'Phone: 555-1234' },
      { content: 'Contact diego@example.org' },
    ]);
    const detectedMatches = [
      createEmailMatch(0, 'content', 7, 'maria@test.com'),
      createPhoneMatch(0, 'data', 7, '555-1234'),
      createEmailMatch(1, 'content', 8, 'diego@example.org'),
    ];

    const result = resolveOverlapsAndMask({
      detectedMatches,
      state,
      rules: [emailRule, phoneRule],
    });

    const emailMask = getEntityMask({ value: 'maria@test.com', class_name: 'EMAIL' });
    const phoneMask = getEntityMask({ value: '555-1234', class_name: 'PHONE' });
    const emailMask2 = getEntityMask({ value: 'diego@example.org', class_name: 'EMAIL' });
    expect(result.records[0].content).toBe(`Email: ${emailMask}`);
    expect(result.records[0].data).toBe(`Phone: ${phoneMask}`);
    expect(result.records[1].content).toBe(`Contact ${emailMask2}`);
    expect(result.anonymizations).toHaveLength(3);
    expect(result.anonymizations[0]).toEqual({
      rule: { type: 'RegExp' },
      entity: { value: 'maria@test.com', class_name: 'EMAIL', mask: emailMask },
    });
    expect(result.anonymizations[1]).toEqual({
      rule: { type: 'RegExp' },
      entity: { value: '555-1234', class_name: 'PHONE', mask: phoneMask },
    });
    expect(result.anonymizations[2]).toEqual({
      rule: { type: 'RegExp' },
      entity: { value: 'diego@example.org', class_name: 'EMAIL', mask: emailMask2 },
    });
  });

  it('resolves overlaps by rule precedence (earlier rule wins)', () => {
    const state = createInitialState([{ content: 'Contact sofia@example.com today' }]);
    const detectedMatches = [
      createEmailMatch(0, 'content', 8, 'sofia@example.com'),
      createDomainMatch(0, 'content', 14, 'example.com'),
    ];

    const result = resolveOverlapsAndMask({
      detectedMatches,
      state,
      rules: [emailRule, domainRule],
    });

    const emailMask = getEntityMask({ value: 'sofia@example.com', class_name: 'EMAIL' });
    expect(result.records[0].content).toBe(`Contact ${emailMask} today`);
    expect(result.anonymizations).toHaveLength(1);
    expect(result.anonymizations[0]).toEqual({
      rule: { type: 'RegExp' },
      entity: { value: 'sofia@example.com', class_name: 'EMAIL', mask: emailMask },
    });
  });

  it('preserves existing anonymizations in state', () => {
    const state: AnonymizationState = {
      records: [{ content: 'Email luis@test.com' }],
      anonymizations: [
        {
          rule: { type: 'RegExp' },
          entity: {
            value: 'existing',
            class_name: 'EXISTING',
            mask: getEntityMask({ value: 'existing', class_name: 'EXISTING' }),
          },
        },
      ],
    };
    const detectedMatches = [createEmailMatch(0, 'content', 6, 'luis@test.com')];

    const result = resolveOverlapsAndMask({ detectedMatches, state, rules: [emailRule] });

    expect(result.anonymizations).toHaveLength(2);
    expect(result.anonymizations[0]).toEqual({
      rule: { type: 'RegExp' },
      entity: {
        value: 'existing',
        class_name: 'EXISTING',
        mask: getEntityMask({ value: 'existing', class_name: 'EXISTING' }),
      },
    });
    const emailMask = getEntityMask({ value: 'luis@test.com', class_name: 'EMAIL' });
    expect(result.anonymizations[1]).toEqual({
      rule: { type: 'RegExp' },
      entity: { value: 'luis@test.com', class_name: 'EMAIL', mask: emailMask },
    });
  });
});
