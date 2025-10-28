/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleConvertProcessor } from './convert';
import type { ConvertProcessor } from '../../../types/processors';
import type { TypeState } from '../types';

describe('handleConvertProcessor', () => {
  it('converts string field to number (to different field)', () => {
    const state: TypeState = new Map();
    state.set('count_str', { currentType: 'string', allAssignments: [] });
    const assumptions: any[] = [];

    const processor: ConvertProcessor = {
      action: 'convert',
      from: 'count_str',
      to: 'count_num',
      type: 'integer',
    };

    handleConvertProcessor(processor, state, assumptions, 0, false);

    expect(state.get('count_num')?.currentType).toBe('number');
    expect(state.get('count_str')?.currentType).toBe('string'); // Original unchanged
  });

  it('converts field in place when "to" is not specified', () => {
    const state: TypeState = new Map();
    state.set('status_code', { currentType: 'string', allAssignments: [] });
    const assumptions: any[] = [];

    const processor: ConvertProcessor = {
      action: 'convert',
      from: 'status_code',
      type: 'integer',
    };

    handleConvertProcessor(processor, state, assumptions, 0, false);

    expect(state.get('status_code')?.currentType).toBe('number');
  });

  it('maps integer type to number', () => {
    const state: TypeState = new Map();
    const assumptions: any[] = [];

    const processor: ConvertProcessor = {
      action: 'convert',
      from: 'field',
      to: 'result',
      type: 'integer',
    };

    handleConvertProcessor(processor, state, assumptions, 0, false);
    expect(state.get('result')?.currentType).toBe('number');
  });

  it('maps long type to number', () => {
    const state: TypeState = new Map();
    const assumptions: any[] = [];

    const processor: ConvertProcessor = {
      action: 'convert',
      from: 'field',
      to: 'result',
      type: 'long',
    };

    handleConvertProcessor(processor, state, assumptions, 0, false);
    expect(state.get('result')?.currentType).toBe('number');
  });

  it('maps double type to number', () => {
    const state: TypeState = new Map();
    const assumptions: any[] = [];

    const processor: ConvertProcessor = {
      action: 'convert',
      from: 'field',
      to: 'result',
      type: 'double',
    };

    handleConvertProcessor(processor, state, assumptions, 0, false);
    expect(state.get('result')?.currentType).toBe('number');
  });

  it('maps boolean type to boolean', () => {
    const state: TypeState = new Map();
    const assumptions: any[] = [];

    const processor: ConvertProcessor = {
      action: 'convert',
      from: 'field',
      to: 'result',
      type: 'boolean',
    };

    handleConvertProcessor(processor, state, assumptions, 0, false);
    expect(state.get('result')?.currentType).toBe('boolean');
  });

  it('maps string type to string', () => {
    const state: TypeState = new Map();
    const assumptions: any[] = [];

    const processor: ConvertProcessor = {
      action: 'convert',
      from: 'field',
      to: 'result',
      type: 'string',
    };

    handleConvertProcessor(processor, state, assumptions, 0, false);
    expect(state.get('result')?.currentType).toBe('string');
  });

  it('handles conditional convert (with where)', () => {
    const state: TypeState = new Map();
    state.set('value', { currentType: 'string', allAssignments: [] });
    const assumptions: any[] = [];

    const processor: ConvertProcessor = {
      action: 'convert',
      from: 'value',
      to: 'value_num',
      type: 'integer',
      where: { field: 'type', eq: 'numeric' },
    };

    handleConvertProcessor(processor, state, assumptions, 0, true);

    const fieldInfo = state.get('value_num');
    expect(fieldInfo?.currentType).toBe('number');
    expect(fieldInfo?.allAssignments[0].isConditional).toBe(true);
  });

  it('converts unknown field type (typeof placeholder)', () => {
    const state: TypeState = new Map();
    state.set('unknown_field', {
      currentType: 'typeof_unknown_field',
      allAssignments: [],
    });
    const assumptions: any[] = [];

    const processor: ConvertProcessor = {
      action: 'convert',
      from: 'unknown_field',
      to: 'known_field',
      type: 'string',
    };

    handleConvertProcessor(processor, state, assumptions, 0, false);

    // Target field should be string regardless of source type
    expect(state.get('known_field')?.currentType).toBe('string');
  });

  it('allows converting same field from number to string unconditionally', () => {
    const state: TypeState = new Map();
    state.set('value', { currentType: 'number', allAssignments: [] });
    const assumptions: any[] = [];

    const processor: ConvertProcessor = {
      action: 'convert',
      from: 'value',
      type: 'string',
    };

    handleConvertProcessor(processor, state, assumptions, 0, false);

    // Type change is OK because it's unconditional
    expect(state.get('value')?.currentType).toBe('string');
  });

  it('handles conversion from non-existent field', () => {
    const state: TypeState = new Map();
    const assumptions: any[] = [];

    const processor: ConvertProcessor = {
      action: 'convert',
      from: 'new_field',
      to: 'converted',
      type: 'integer',
    };

    handleConvertProcessor(processor, state, assumptions, 0, false);

    // Source field won't be in state (getOrCreateFieldType only returns the type)
    // Target field should have the converted type
    expect(state.get('converted')?.currentType).toBe('number');
  });

  it('handles complex conversion chain', () => {
    const state: TypeState = new Map();
    state.set('original', { currentType: 'string', allAssignments: [] });
    const assumptions: any[] = [];

    // First conversion: string -> number
    const processor1: ConvertProcessor = {
      action: 'convert',
      from: 'original',
      to: 'as_number',
      type: 'integer',
    };
    handleConvertProcessor(processor1, state, assumptions, 0, false);

    // Second conversion: number -> boolean
    const processor2: ConvertProcessor = {
      action: 'convert',
      from: 'as_number',
      to: 'as_boolean',
      type: 'boolean',
    };
    handleConvertProcessor(processor2, state, assumptions, 1, false);

    // Third conversion: boolean -> string
    const processor3: ConvertProcessor = {
      action: 'convert',
      from: 'as_boolean',
      to: 'as_string',
      type: 'string',
    };
    handleConvertProcessor(processor3, state, assumptions, 2, false);

    expect(state.get('original')?.currentType).toBe('string');
    expect(state.get('as_number')?.currentType).toBe('number');
    expect(state.get('as_boolean')?.currentType).toBe('boolean');
    expect(state.get('as_string')?.currentType).toBe('string');
  });
});
