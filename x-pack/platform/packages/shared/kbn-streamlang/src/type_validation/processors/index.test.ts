/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeState, TypeAssumption } from '../types';
import {
  handleSetProcessor,
  handleRenameProcessor,
  handleGrokProcessor,
  handleDissectProcessor,
  handleDateProcessor,
  processProcessor,
} from '.';

describe('processor handlers', () => {
  let state: TypeState;
  let assumptions: TypeAssumption[];

  beforeEach(() => {
    state = new Map();
    assumptions = [];
  });

  describe('handleSetProcessor', () => {
    it('infers type from string value', () => {
      handleSetProcessor(
        { action: 'set', to: 'field1', value: 'hello' },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('field1')?.currentType).toBe('string');
    });

    it('infers type from number value', () => {
      handleSetProcessor({ action: 'set', to: 'field1', value: 123 }, state, assumptions, 0, false);

      expect(state.get('field1')?.currentType).toBe('number');
    });

    it('infers type from boolean value', () => {
      handleSetProcessor(
        { action: 'set', to: 'field1', value: true },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('field1')?.currentType).toBe('boolean');
    });

    it('copies type from source field', () => {
      // Set up source field
      handleSetProcessor(
        { action: 'set', to: 'source', value: 'text' },
        state,
        assumptions,
        0,
        false
      );

      // Copy from source
      handleSetProcessor(
        { action: 'set', to: 'target', copy_from: 'source' },
        state,
        assumptions,
        1,
        false
      );

      expect(state.get('target')?.currentType).toBe('string');
    });

    it('creates typeof placeholder when copying from unknown field', () => {
      handleSetProcessor(
        { action: 'set', to: 'target', copy_from: 'unknown' },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('target')?.currentType).toBe('typeof_unknown');
    });
  });

  describe('handleRenameProcessor', () => {
    it('propagates type from source to target', () => {
      // Set up source field
      handleSetProcessor(
        { action: 'set', to: 'old_name', value: 123 },
        state,
        assumptions,
        0,
        false
      );

      // Rename it
      handleRenameProcessor(
        { action: 'rename', from: 'old_name', to: 'new_name' },
        state,
        assumptions,
        1,
        false
      );

      expect(state.get('new_name')?.currentType).toBe('number');
    });

    it('creates typeof placeholder when renaming unknown field', () => {
      handleRenameProcessor(
        { action: 'rename', from: 'unknown', to: 'renamed' },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('renamed')?.currentType).toBe('typeof_unknown');
    });
  });

  describe('handleGrokProcessor', () => {
    it('extracts fields with keyword type as string', () => {
      handleGrokProcessor(
        {
          action: 'grok',
          from: 'message',
          patterns: ['%{WORD:verb} %{WORD:noun}'],
        },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('verb')?.currentType).toBe('string');
      expect(state.get('noun')?.currentType).toBe('string');
    });

    it('extracts fields with int type as number', () => {
      handleGrokProcessor(
        {
          action: 'grok',
          from: 'message',
          patterns: ['%{NUMBER:count:int}'],
        },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('count')?.currentType).toBe('number');
    });

    it('extracts fields with float type as number', () => {
      handleGrokProcessor(
        {
          action: 'grok',
          from: 'message',
          patterns: ['%{NUMBER:price:float}'],
        },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('price')?.currentType).toBe('number');
    });

    it('handles multiple patterns', () => {
      handleGrokProcessor(
        {
          action: 'grok',
          from: 'message',
          patterns: ['%{WORD:field1}', '%{NUMBER:field2:int}'],
        },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('field1')?.currentType).toBe('string');
      expect(state.get('field2')?.currentType).toBe('number');
    });
  });

  describe('handleDissectProcessor', () => {
    it('extracts fields as strings', () => {
      handleDissectProcessor(
        {
          action: 'dissect',
          from: 'message',
          pattern: '%{field1} %{field2}',
        },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('field1')?.currentType).toBe('string');
      expect(state.get('field2')?.currentType).toBe('string');
    });

    it('handles complex patterns', () => {
      handleDissectProcessor(
        {
          action: 'dissect',
          from: 'message',
          pattern: '%{timestamp} %{level} %{message}',
        },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('timestamp')?.currentType).toBe('string');
      expect(state.get('level')?.currentType).toBe('string');
      expect(state.get('message')?.currentType).toBe('string');
    });
  });

  describe('handleDateProcessor', () => {
    it('assigns date type to target field', () => {
      handleDateProcessor(
        {
          action: 'date',
          from: 'timestamp_string',
          to: 'timestamp',
          formats: ['ISO8601'],
        },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('timestamp')?.currentType).toBe('date');
    });

    it('defaults target to source field', () => {
      handleDateProcessor(
        {
          action: 'date',
          from: 'timestamp',
          formats: ['ISO8601'],
        },
        state,
        assumptions,
        0,
        false
      );

      expect(state.get('timestamp')?.currentType).toBe('date');
    });
  });

  describe('processProcessor', () => {
    it('dispatches to correct handler based on action', () => {
      processProcessor(
        { action: 'set', to: 'field1', value: 'test' },
        state,
        assumptions,
        0,
        false
      );
      expect(state.get('field1')?.currentType).toBe('string');

      processProcessor(
        { action: 'date', from: 'field1', to: 'field2', formats: ['ISO8601'] },
        state,
        assumptions,
        1,
        false
      );
      expect(state.get('field2')?.currentType).toBe('date');
    });

    it('passes isConditional flag to handlers', () => {
      processProcessor({ action: 'set', to: 'field1', value: 'test' }, state, assumptions, 0, true);

      const assignment = state.get('field1')?.allAssignments[0];
      expect(assignment?.isConditional).toBe(true);
    });
  });
});
