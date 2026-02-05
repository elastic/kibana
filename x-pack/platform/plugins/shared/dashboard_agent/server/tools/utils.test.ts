/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResultStore } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils/config_builder';
import { resolveLensConfig } from './utils';

const createMockResultStore = (
  results: Map<string, { type: string; data: Record<string, unknown> }>
): ToolResultStore => {
  return {
    has: (id: string) => results.has(id),
    get: (id: string) => {
      const result = results.get(id);
      return {
        ...result,
        tool_result_id: '',
      } as ReturnType<ToolResultStore['get']>;
    },
  };
};

describe('resolveLensConfig', () => {
  // Minimal valid config for testing
  const validLensConfig = {
    type: 'metric',
    title: 'Test Metric',
    dataset: { type: 'esql', query: 'FROM test' },
    metric: { operation: 'count' },
  } as unknown as LensApiSchemaType;

  describe('when panel is a direct config object', () => {
    it('should return the config when panel is a valid Lens API config', () => {
      const result = resolveLensConfig(validLensConfig);
      expect(result).toEqual(validLensConfig);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a number', 42],
      ['an object without type', { title: 'No type' }],
    ])('should throw when panel is %s', (_, invalidPanel) => {
      expect(() => resolveLensConfig(invalidPanel)).toThrow(
        'Invalid panel configuration. Expected a Lens API config object with a "type" property.'
      );
    });
  });

  describe('when panel is a string reference', () => {
    it('should throw when string is not a valid tool result id format', () => {
      expect(() => resolveLensConfig('invalid-id')).toThrow(
        'Invalid panel reference "invalid-id". Expected a tool_result_id from a previous visualization tool call.'
      );
    });

    it('should throw when resultStore is not provided', () => {
      expect(() => resolveLensConfig('abc123')).toThrow(
        'Panel reference "abc123" was not found in the tool result store.'
      );
    });

    it('should throw when panel reference is not found in resultStore', () => {
      const resultStore = createMockResultStore(new Map());
      expect(() => resolveLensConfig('abc123', resultStore)).toThrow(
        'Panel reference "abc123" was not found in the tool result store.'
      );
    });

    it('should throw when referenced result is not a visualization type', () => {
      const results = new Map([
        ['abc123', { type: ToolResultType.other, data: { someData: true } }],
      ]);
      const resultStore = createMockResultStore(results);

      expect(() => resolveLensConfig('abc123', resultStore)).toThrow(
        'Provided tool_result_id "abc123" is not a visualization result (got "other").'
      );
    });

    it('should throw when visualization result has no visualization config', () => {
      const results = new Map([['abc123', { type: ToolResultType.visualization, data: {} }]]);
      const resultStore = createMockResultStore(results);

      expect(() => resolveLensConfig('abc123', resultStore)).toThrow(
        'Visualization result "abc123" does not contain a valid visualization config.'
      );
    });

    it('should throw when visualization config is not an object', () => {
      const results = new Map([
        [
          'abc123',
          { type: ToolResultType.visualization, data: { visualization: 'not-an-object' } },
        ],
      ]);
      const resultStore = createMockResultStore(results);

      expect(() => resolveLensConfig('abc123', resultStore)).toThrow(
        'Visualization result "abc123" does not contain a valid visualization config.'
      );
    });

    it('should return the visualization config when valid', () => {
      const results = new Map([
        [
          'abc123',
          { type: ToolResultType.visualization, data: { visualization: validLensConfig } },
        ],
      ]);
      const resultStore = createMockResultStore(results);

      const result = resolveLensConfig('abc123', resultStore);
      expect(result).toEqual(validLensConfig);
    });
  });
});
