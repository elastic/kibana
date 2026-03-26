/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '../../types/streamlang';
import {
  addDeterministicCustomIdentifiers,
  checkAdditiveChanges,
  getProcessorsCount,
} from './diff_utilities';

describe('addDeterministicCustomIdentifiers', () => {
  it('does not mutate the original DSL', () => {
    const originalDSL: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1' },
        { action: 'set', to: 'field2', value: 'value2' },
      ],
    };

    // Create a deep copy to compare against
    const originalCopy = JSON.parse(JSON.stringify(originalDSL));

    // Call the function
    const result = addDeterministicCustomIdentifiers(originalDSL);

    // Original should remain unchanged
    expect(originalDSL).toEqual(originalCopy);
    expect('customIdentifier' in originalDSL.steps[0]).toBe(false);

    // Result should have identifiers
    expect('customIdentifier' in result.steps[0]).toBe(true);
    expect('customIdentifier' in result.steps[1]).toBe(true);
  });

  it('returns a new DSL object with customIdentifiers', () => {
    const originalDSL: StreamlangDSL = {
      steps: [{ action: 'set', to: 'field1', value: 'value1' }],
    };

    const result = addDeterministicCustomIdentifiers(originalDSL);

    // Should be a different object reference
    expect(result).not.toBe(originalDSL);
    expect(result.steps).not.toBe(originalDSL.steps);

    // Result should have identifiers
    expect('customIdentifier' in result.steps[0]).toBe(true);
  });

  it('generates consistent identifiers for the same DSL', () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'set', to: 'field1', value: 'value1' }],
    };

    const result1 = addDeterministicCustomIdentifiers(dsl);
    const result2 = addDeterministicCustomIdentifiers(dsl);

    // Same input should produce same identifiers
    expect('customIdentifier' in result1.steps[0] && result1.steps[0].customIdentifier).toBe(
      'customIdentifier' in result2.steps[0] && result2.steps[0].customIdentifier
    );
  });
});

describe('checkAdditiveChanges', () => {
  it('detects purely additive changes when steps are added at the end', () => {
    const previousDSL: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1', customIdentifier: 'id1' },
        { action: 'set', to: 'field2', value: 'value2', customIdentifier: 'id2' },
      ],
    };

    const nextDSL: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1', customIdentifier: 'id1' },
        { action: 'set', to: 'field2', value: 'value2', customIdentifier: 'id2' },
        { action: 'set', to: 'field3', value: 'value3', customIdentifier: 'id3' },
      ],
    };

    const result = checkAdditiveChanges(previousDSL, nextDSL);

    expect(result.isPurelyAdditive).toBe(true);
    expect(result.newSteps).toHaveLength(1);
    expect('action' in result.newSteps[0] && result.newSteps[0].action).toBe('set');
    expect('to' in result.newSteps[0] && result.newSteps[0].to).toBe('field3');
    expect(result.newStepIds).toEqual(['id3']);
  });

  it('returns false when a step is modified', () => {
    const previousDSL: StreamlangDSL = {
      steps: [{ action: 'set', to: 'field1', value: 'value1' }],
    };

    const nextDSL: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'changedValue' }, // Modified
      ],
    };

    const result = checkAdditiveChanges(previousDSL, nextDSL);

    expect(result.isPurelyAdditive).toBe(false);
    expect(result.newSteps).toHaveLength(0);
  });

  it('returns false when a step is removed', () => {
    const previousDSL: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1' },
        { action: 'set', to: 'field2', value: 'value2' },
      ],
    };

    const nextDSL: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1' },
        // field2 removed
      ],
    };

    const result = checkAdditiveChanges(previousDSL, nextDSL);

    expect(result.isPurelyAdditive).toBe(false);
    expect(result.newSteps).toHaveLength(0);
  });

  it('returns false when a step is inserted in the middle', () => {
    const previousDSL: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1' },
        { action: 'set', to: 'field3', value: 'value3' },
      ],
    };

    const nextDSL: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1' },
        { action: 'set', to: 'field2', value: 'value2' }, // Inserted in middle
        { action: 'set', to: 'field3', value: 'value3' },
      ],
    };

    const result = checkAdditiveChanges(previousDSL, nextDSL);

    expect(result.isPurelyAdditive).toBe(false);
    expect(result.newSteps).toHaveLength(0);
  });

  it('returns true when multiple steps are added at the end', () => {
    const previousDSL: StreamlangDSL = {
      steps: [{ action: 'set', to: 'field1', value: 'value1' }],
    };

    const nextDSL: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1' },
        { action: 'set', to: 'field2', value: 'value2' },
        { action: 'set', to: 'field3', value: 'value3' },
      ],
    };

    const result = checkAdditiveChanges(previousDSL, nextDSL);

    expect(result.isPurelyAdditive).toBe(true);
    expect(result.newSteps).toHaveLength(2);
  });

  it('returns true when starting with an empty DSL', () => {
    const previousDSL: StreamlangDSL = {
      steps: [],
    };

    const nextDSL: StreamlangDSL = {
      steps: [{ action: 'set', to: 'field1', value: 'value1' }],
    };

    const result = checkAdditiveChanges(previousDSL, nextDSL);

    expect(result.isPurelyAdditive).toBe(true);
    expect(result.newSteps).toHaveLength(1);
  });

  it('collects stepIds from nested steps in where blocks', () => {
    const previousDSL: StreamlangDSL = {
      steps: [{ action: 'set', to: 'field1', value: 'value1', customIdentifier: 'id1' }],
    };

    const nextDSL: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1', customIdentifier: 'id1' },
        {
          condition: {
            field: 'status',
            eq: 'active',
            steps: [
              { action: 'set', to: 'field2', value: 'value2', customIdentifier: 'id2' },
              { action: 'set', to: 'field3', value: 'value3', customIdentifier: 'id3' },
            ],
          },
          customIdentifier: 'where1',
        },
        { action: 'set', to: 'field4', value: 'value4', customIdentifier: 'id4' },
      ],
    };

    const result = checkAdditiveChanges(previousDSL, nextDSL);

    expect(result.isPurelyAdditive).toBe(true);
    expect(result.newSteps).toHaveLength(2);
    // Should collect IDs from the where block and nested steps, plus the action after it
    expect(result.newStepIds).toEqual(['where1', 'id2', 'id3', 'id4']);
  });

  it('treats nested appended steps as additive changes', () => {
    const previousDSL: StreamlangDSL = {
      steps: [
        {
          condition: {
            field: 'status',
            eq: 'active',
            steps: [
              { action: 'set', to: 'field2', value: 'value2', customIdentifier: 'id-child-1' },
            ],
          },
          customIdentifier: 'where1',
        },
      ],
    };

    const nextDSL: StreamlangDSL = {
      steps: [
        {
          condition: {
            field: 'status',
            eq: 'active',
            steps: [
              { action: 'set', to: 'field2', value: 'value2', customIdentifier: 'id-child-1' },
              { action: 'set', to: 'field3', value: 'value3', customIdentifier: 'id-child-2' },
            ],
          },
          customIdentifier: 'where1',
        },
      ],
    };

    const result = checkAdditiveChanges(previousDSL, nextDSL);

    expect(result.isPurelyAdditive).toBe(true);
    expect(result.newSteps).toHaveLength(0);
    expect(result.newStepIds).toEqual(['id-child-2']);
  });

  it('returns true when no changes are made', () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'set', to: 'field1', value: 'value1' }],
    };

    const result = checkAdditiveChanges(dsl, dsl);

    expect(result.isPurelyAdditive).toBe(true);
    expect(result.newSteps).toHaveLength(0);
    expect(result.newStepIds).toEqual([]);
  });
});

describe('getProcessorsCount', () => {
  it('counts zero processors in an empty DSL', () => {
    const dsl: StreamlangDSL = {
      steps: [],
    };

    const count = getProcessorsCount(dsl);

    expect(count).toBe(0);
  });

  it('counts a single processor', () => {
    const dsl: StreamlangDSL = {
      steps: [{ action: 'set', to: 'field1', value: 'value1' }],
    };

    const count = getProcessorsCount(dsl);

    expect(count).toBe(1);
  });

  it('counts multiple processors at the root level', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1' },
        { action: 'set', to: 'field2', value: 'value2' },
        { action: 'append', to: 'tags', value: ['tag1'] },
      ],
    };

    const count = getProcessorsCount(dsl);

    expect(count).toBe(3);
  });

  it('does not count where blocks, only nested action blocks', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1' },
        {
          condition: {
            field: 'status',
            eq: 'active',
            steps: [{ action: 'set', to: 'field2', value: 'value2' }],
          },
        },
      ],
    };

    const count = getProcessorsCount(dsl);

    // Should count 2: the root set and the nested set (not the where block itself)
    expect(count).toBe(2);
  });

  it('counts processors in deeply nested where blocks', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1' },
        {
          condition: {
            field: 'level1',
            eq: 'value1',
            steps: [
              { action: 'set', to: 'field2', value: 'value2' },
              {
                condition: {
                  field: 'level2',
                  eq: 'value2',
                  steps: [
                    { action: 'set', to: 'field3', value: 'value3' },
                    { action: 'append', to: 'tags', value: ['tag'] },
                  ],
                },
              },
            ],
          },
        },
        { action: 'set', to: 'field4', value: 'value4' },
      ],
    };

    const count = getProcessorsCount(dsl);

    // Should count: field1, field2, field3, tags append, field4 = 5 processors
    expect(count).toBe(5);
  });

  it('counts processors in multiple where blocks at the same level', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1' },
        {
          condition: {
            field: 'status',
            eq: 'active',
            steps: [
              { action: 'set', to: 'active_field', value: 'yes' },
              { action: 'append', to: 'tags', value: ['active'] },
            ],
          },
        },
        {
          condition: {
            field: 'status',
            eq: 'inactive',
            steps: [{ action: 'set', to: 'inactive_field', value: 'no' }],
          },
        },
        { action: 'set', to: 'field2', value: 'value2' },
      ],
    };

    const count = getProcessorsCount(dsl);

    // Should count: field1, active_field, tags append, inactive_field, field2 = 5 processors
    expect(count).toBe(5);
  });

  it('handles where blocks with no nested steps', () => {
    const dsl: StreamlangDSL = {
      steps: [
        { action: 'set', to: 'field1', value: 'value1' },
        {
          condition: {
            field: 'status',
            eq: 'active',
            steps: [],
          },
        },
        { action: 'set', to: 'field2', value: 'value2' },
      ],
    };

    const count = getProcessorsCount(dsl);

    // Should count only the 2 set processors
    expect(count).toBe(2);
  });
});
