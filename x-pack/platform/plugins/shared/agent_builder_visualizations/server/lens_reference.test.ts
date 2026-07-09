/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import {
  withLensReferences,
  toLensApiConfig,
  toSupportedChartType,
  extractEsqlFromLens,
} from './lens_reference';

const mockToAPIFormat = jest.fn();

jest.mock('@kbn/lens-embeddable-utils', () => ({
  LensConfigBuilder: jest.fn().mockImplementation(() => ({
    toAPIFormat: (...args: unknown[]) => mockToAPIFormat(...args),
  })),
}));

describe('lens_reference helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withLensReferences', () => {
    it('applies the provided references', () => {
      const attributes = { title: 'viz' } as unknown as LensAttributes;
      const references = [{ id: 'idx', name: 'ref', type: 'index-pattern' }];

      const result = withLensReferences(attributes, references);

      expect(result.references).toEqual(references);
    });

    it('falls back to existing references when none are provided', () => {
      const references = [{ id: 'idx', name: 'ref', type: 'index-pattern' }];
      const attributes = { title: 'viz', references } as unknown as LensAttributes;

      const result = withLensReferences(attributes, undefined);

      expect(result.references).toEqual(references);
    });

    it('defaults to an empty array when there are no references at all', () => {
      const attributes = { title: 'viz' } as unknown as LensAttributes;

      const result = withLensReferences(attributes, undefined);

      expect(result.references).toEqual([]);
    });
  });

  describe('toLensApiConfig', () => {
    it('delegates conversion to LensConfigBuilder.toAPIFormat', () => {
      const attributes = { title: 'viz' } as unknown as LensAttributes;
      mockToAPIFormat.mockReturnValue({ type: 'xy', layers: [] });

      const result = toLensApiConfig(attributes);

      expect(mockToAPIFormat).toHaveBeenCalledWith(attributes);
      expect(result).toEqual({ type: 'xy', layers: [] });
    });
  });

  describe('toSupportedChartType', () => {
    it.each(['xy', 'metric', 'pie', 'heatmap', 'datatable', 'region_map'])(
      'returns %s unchanged for a supported chart type',
      (type) => {
        expect(toSupportedChartType(type)).toBe(type);
      }
    );

    it.each(['lnsXY', 'lnsPie', 'bar', 'line', 'area', 'unknown', ''])(
      'returns undefined for the unsupported value %p',
      (type) => {
        expect(toSupportedChartType(type)).toBeUndefined();
      }
    );

    it('returns undefined when the type is undefined', () => {
      expect(toSupportedChartType(undefined)).toBeUndefined();
    });
  });

  describe('extractEsqlFromLens', () => {
    it('returns the ES|QL embedded in the first text-based layer', () => {
      const attributes = {
        state: {
          datasourceStates: {
            textBased: {
              layers: {
                layer1: { query: { esql: 'FROM logs | LIMIT 10' } },
              },
            },
          },
        },
      } as unknown as LensAttributes;

      expect(extractEsqlFromLens(attributes)).toBe('FROM logs | LIMIT 10');
    });

    it('returns an empty string when there is no text-based layer', () => {
      const attributes = { state: { datasourceStates: {} } } as unknown as LensAttributes;

      expect(extractEsqlFromLens(attributes)).toBe('');
    });

    it('returns an empty string for malformed state', () => {
      const attributes = {} as unknown as LensAttributes;

      expect(extractEsqlFromLens(attributes)).toBe('');
    });
  });
});
