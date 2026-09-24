/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_PROGRESS_BAR_COLOR,
  getCellDecorationLabel,
  getDecorationDefaultColor,
  getUnsupportedAlignmentReason,
  isAlignmentSupported,
  isColumnKindSupported,
  parseCellDecorationFillConfig,
} from './cell_decoration';

describe('cell decoration capabilities', () => {
  describe('getCellDecorationLabel', () => {
    it('surfaces the stored "cell" value as "Background"', () => {
      expect(getCellDecorationLabel('cell')).toBe('Background');
    });
  });

  describe('isColumnKindSupported', () => {
    it('offers progress for numeric columns only', () => {
      expect(isColumnKindSupported('progress', 'numeric')).toBe(true);
      expect(isColumnKindSupported('progress', 'bucketed')).toBe(false);
    });
  });

  describe('alignment support', () => {
    it('disallows center for progress and allows left/right', () => {
      expect(isAlignmentSupported('progress', 'center')).toBe(false);
      expect(isAlignmentSupported('progress', 'left')).toBe(true);
      expect(isAlignmentSupported('progress', 'right')).toBe(true);
    });

    it('explains why center is unsupported for progress, with the decoration name', () => {
      const reason = getUnsupportedAlignmentReason('progress', 'center');
      expect(reason).toContain('Center');
      expect(reason).toContain('Progress bar');
    });
  });

  describe('defaults', () => {
    it('seeds the progress default color from the registry', () => {
      expect(getDecorationDefaultColor('progress')).toBe(DEFAULT_PROGRESS_BAR_COLOR);
    });
  });

  describe('parseCellDecorationFillConfig', () => {
    it('parses a JSON-serialized fill config', () => {
      const raw = JSON.stringify({ fillMode: 'single', color: '#abcdef' });
      expect(parseCellDecorationFillConfig(raw)).toEqual({ fillMode: 'single', color: '#abcdef' });
    });

    it('returns an already-deserialized object as-is', () => {
      const obj = { fillMode: 'gradient' as const };
      expect(parseCellDecorationFillConfig(obj)).toBe(obj);
    });

    it('degrades malformed JSON to undefined', () => {
      expect(parseCellDecorationFillConfig('{not json')).toBeUndefined();
    });

    it('degrades shape-invalid values to undefined', () => {
      expect(parseCellDecorationFillConfig({ fillMode: 'nope' })).toBeUndefined();
      expect(parseCellDecorationFillConfig(JSON.stringify({ fillMode: 'nope' }))).toBeUndefined();
    });
  });
});
