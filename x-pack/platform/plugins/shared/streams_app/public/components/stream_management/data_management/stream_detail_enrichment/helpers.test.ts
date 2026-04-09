/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldSuggestProcessorKey, detectProcessorContext } from './helpers';
import type { monaco } from '@kbn/monaco';

describe('helpers', () => {
  describe('shouldSuggestProcessorKey', () => {
    it('returns true at start of key position', () => {
      const lineBefore = '  { "';
      const nearby = '[\n  {\n';
      expect(shouldSuggestProcessorKey(lineBefore, nearby)).toBe(true);
    });

    it('returns false after colon', () => {
      const lineBefore = '  "grok": ';
      const nearby = '{ "grok": ';
      expect(shouldSuggestProcessorKey(lineBefore, nearby)).toBe(false);
    });

    it('returns false inside triple quote', () => {
      const lineBefore = '  """ inside';
      const nearby = '"""';
      expect(shouldSuggestProcessorKey(lineBefore, nearby)).toBe(false);
    });
  });

  describe('detectProcessorContext', () => {
    const createFakeModel = (lines: string[]): monaco.editor.ITextModel => {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getValueInRange: ({ startLineNumber, startColumn, endLineNumber, endColumn }: any) => {
          if (startLineNumber === endLineNumber) {
            const s = lines[startLineNumber - 1] || '';
            return s.slice(startColumn - 1, endColumn - 1);
          }
          const parts: string[] = [];
          parts.push((lines[startLineNumber - 1] || '').slice(startColumn - 1));
          for (let ln = startLineNumber + 1; ln < endLineNumber; ln++) {
            parts.push(lines[ln - 1] || '');
          }
          parts.push((lines[endLineNumber - 1] || '').slice(0, Math.max(0, endColumn - 1)));
          return parts.join('\n');
        },
        getLineMaxColumn: (line: number) => (lines[line - 1] ? lines[line - 1].length + 1 : 1),
        getLineContent: (line: number) => lines[line - 1] || '',
      } as unknown as monaco.editor.ITextModel;
    };

    it('returns processorKey at top-level array', () => {
      const model = createFakeModel(['[', '  { "', '  }', ']']);
      const pos = { lineNumber: 2, column: 6 } as monaco.Position;
      const ctx = detectProcessorContext(model, pos, ['grok', 'set']);
      expect(ctx.kind).toBe('processorKey');
    });

    it('returns processorProperty inside known processor object', () => {
      const model = createFakeModel(['[', '  { "grok": { "', '  }', ']']);
      const pos = { lineNumber: 2, column: 17 } as monaco.Position;
      const ctx = detectProcessorContext(model, pos, ['grok', 'set']);
      expect(ctx.kind).toBe('processorProperty');
      expect(ctx.processorName).toBe('grok');
    });
  });
});
