/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseLogSamples, parseNDJSON, parseJSONArray, getFormatDescription } from './file_parser';
import { MAX_LOG_SAMPLES } from './upload_samples_limits';

describe('file_parser', () => {
  describe('parseNDJSON', () => {
    it('parses single-line NDJSON', () => {
      const content = '{"a":1}\n{"b":2}\n{"c":3}';
      const result = parseNDJSON(content);
      expect(result).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
    });

    it('handles empty lines', () => {
      const content = '{"a":1}\n\n{"b":2}\n';
      const result = parseNDJSON(content);
      expect(result).toEqual([{ a: 1 }, { b: 2 }]);
    });

    it('parses multiline JSON when multiline flag is true', () => {
      const content = `{
  "field": "value1"
}
{
  "field": "value2"
}`;
      const result = parseNDJSON(content, true);
      expect(result).toEqual([{ field: 'value1' }, { field: 'value2' }]);
    });

    it('throws on invalid JSON', () => {
      const content = '{"a":1}\nnot json\n{"b":2}';
      expect(() => parseNDJSON(content)).toThrow();
    });
  });

  describe('parseJSONArray', () => {
    it('parses a JSON array directly', () => {
      const content = '[{"a":1},{"b":2}]';
      const result = parseJSONArray(content);
      expect(result).toEqual({
        entries: [{ a: 1 }, { b: 2 }],
        pathToEntries: [],
        errorNoArrayFound: false,
      });
    });

    it('finds array nested in object with single array key', () => {
      const content = '{"data":[{"a":1},{"b":2}]}';
      const result = parseJSONArray(content);
      expect(result).toEqual({
        entries: [{ a: 1 }, { b: 2 }],
        pathToEntries: ['data'],
        errorNoArrayFound: false,
      });
    });

    it('returns error when object has no array', () => {
      const content = '{"key":"value"}';
      const result = parseJSONArray(content);
      expect(result.errorNoArrayFound).toBe(true);
    });

    it('returns error when object has multiple arrays', () => {
      const content = '{"arr1":[1,2],"arr2":[3,4]}';
      const result = parseJSONArray(content);
      expect(result.errorNoArrayFound).toBe(true);
    });
  });

  describe('parseLogSamples', () => {
    describe('NDJSON format', () => {
      it('detects and parses NDJSON', () => {
        const content =
          '{"timestamp":"2025-01-01","level":"INFO"}\n{"timestamp":"2025-01-02","level":"WARN"}';
        const result = parseLogSamples(content);

        expect(result.detectedFormat).toBe('ndjson');
        expect(result.samples).toHaveLength(2);
        expect(JSON.parse(result.samples[0])).toEqual({
          timestamp: '2025-01-01',
          level: 'INFO',
        });
        expect(result.warnings).toHaveLength(0);
      });

      it('handles NDJSON with trailing newline', () => {
        const content = '{"a":1}\n{"b":2}\n';
        const result = parseLogSamples(content);

        expect(result.detectedFormat).toBe('ndjson');
        expect(result.samples).toHaveLength(2);
      });
    });

    describe('JSON array format', () => {
      it('detects and parses JSON array', () => {
        const content = '[{"event":"login"},{"event":"logout"}]';
        const result = parseLogSamples(content);

        expect(result.detectedFormat).toBe('json_array');
        expect(result.samples).toHaveLength(2);
        expect(result.jsonPath).toEqual([]);
      });

      it('treats JSON object with nested array as NDJSON', () => {
        const content = '{"events":[{"type":"a"},{"type":"b"}]}';
        const result = parseLogSamples(content);

        expect(result.detectedFormat).toBe('ndjson');
        expect(result.samples).toHaveLength(1);
        expect(JSON.parse(result.samples[0])).toEqual({
          events: [{ type: 'a' }, { type: 'b' }],
        });
      });

      it('handles pretty-printed JSON array', () => {
        const content = `[
  {
    "timestamp": "2025-01-01",
    "message": "Hello"
  },
  {
    "timestamp": "2025-01-02",
    "message": "World"
  }
]`;
        const result = parseLogSamples(content);

        expect(result.detectedFormat).toBe('json_array');
        expect(result.samples).toHaveLength(2);
        expect(JSON.parse(result.samples[0])).toEqual({
          timestamp: '2025-01-01',
          message: 'Hello',
        });
      });

      it('returns EMPTY error for empty JSON array', () => {
        const content = '[]';
        const result = parseLogSamples(content);

        expect(result.samples).toHaveLength(0);
        expect(result.error).toBe('EMPTY');
      });
    });

    describe('multiline NDJSON format', () => {
      it('detects and parses multiline NDJSON', () => {
        const content = `{
  "field1": "value1",
  "field2": "value2"
}
{
  "field1": "value3",
  "field2": "value4"
}`;
        const result = parseLogSamples(content);

        expect(result.detectedFormat).toBe('ndjson_multiline');
        expect(result.samples).toHaveLength(2);
        expect(JSON.parse(result.samples[0])).toEqual({
          field1: 'value1',
          field2: 'value2',
        });
      });
    });

    describe('line-based format', () => {
      it('falls back to line-based for non-JSON content', () => {
        const content = `Jan 15 10:30:45 server app: Message 1
Jan 15 10:30:46 server app: Message 2
Jan 15 10:30:47 server app: Message 3`;
        const result = parseLogSamples(content);

        expect(result.detectedFormat).toBe('line_based');
        expect(result.samples).toHaveLength(3);
        expect(result.samples[0]).toBe('Jan 15 10:30:45 server app: Message 1');
      });

      it('handles CSV content as line-based', () => {
        const content = `timestamp,level,message
2025-01-01,INFO,Hello
2025-01-02,WARN,World`;
        const result = parseLogSamples(content);

        expect(result.detectedFormat).toBe('line_based');
        expect(result.samples).toHaveLength(3);
      });

      it('handles empty lines', () => {
        const content = `line1

line2

line3`;
        const result = parseLogSamples(content);

        expect(result.detectedFormat).toBe('line_based');
        expect(result.samples).toHaveLength(3);
        expect(result.samples).toEqual(['line1', 'line2', 'line3']);
      });

      it('returns EMPTY error for empty content', () => {
        const result = parseLogSamples('');

        expect(result.samples).toHaveLength(0);
        expect(result.error).toBe('EMPTY');
      });

      it('returns EMPTY error for whitespace-only content', () => {
        const result = parseLogSamples('   \n\n   \n');

        expect(result.samples).toHaveLength(0);
        expect(result.error).toBe('EMPTY');
      });
    });

    describe('sample limiting', () => {
      it('limits samples to MAX_LOG_SAMPLES by default', () => {
        const lines = Array.from({ length: MAX_LOG_SAMPLES + 100 }, (_, i) => `line${i}`);
        const content = lines.join('\n');
        const result = parseLogSamples(content);

        expect(result.samples).toHaveLength(MAX_LOG_SAMPLES);
        expect(result.samplesOmittedOverLimit).toBe(100);
        expect(result.warnings).toContainEqual(
          expect.stringContaining('100 log lines were omitted')
        );
      });

      it('limits JSON array samples', () => {
        const entries = Array.from({ length: MAX_LOG_SAMPLES + 50 }, (_, i) => ({ id: i }));
        const content = JSON.stringify(entries);
        const result = parseLogSamples(content);

        expect(result.samples).toHaveLength(MAX_LOG_SAMPLES);
        expect(result.samplesOmittedOverLimit).toBe(50);
      });
    });

    describe('edge cases', () => {
      it('handles single JSON object on one line', () => {
        const content = '{"single":"object"}';
        const result = parseLogSamples(content);

        expect(result.detectedFormat).toBe('ndjson');
        expect(result.samples).toHaveLength(1);
      });

      it('returns NOT_OBJECT error for non-object JSON entries', () => {
        const content = '["string1","string2"]';
        const result = parseLogSamples(content);

        expect(result.samples).toHaveLength(0);
        expect(result.error).toBe('NOT_OBJECT');
      });

      it('trims whitespace from line-based samples', () => {
        const content = '  line1  \n  line2  ';
        const result = parseLogSamples(content);

        expect(result.samples).toEqual(['line1', 'line2']);
      });
    });

    describe('possible error formats', () => {
      it('falls back to line-based when NDJSON has invalid lines', () => {
        const content = `{"valid": "json"}
{invalid json here
{"another": "valid"}
not json at all`;
        const result = parseLogSamples(content);

        // Falls back to line-based since NDJSON parsing fails
        expect(result.detectedFormat).toBe('line_based');
        expect(result.samples).toHaveLength(4);
        expect(result.samples[0]).toBe('{"valid": "json"}');
        expect(result.samples[1]).toBe('{invalid json here');
        expect(result.error).toBeUndefined();
      });

      it('returns NOT_ARRAY error for multiline JSON object without array', () => {
        const content = `{
  "config": {"name": "app"},
  "settings": {"debug": true}
}`;
        const result = parseLogSamples(content);

        expect(result.samples).toHaveLength(0);
        expect(result.error).toBe('NOT_ARRAY');
      });

      it('parses JSON object with multiple arrays as NDJSON', () => {
        const content = '{"arr1":[1,2],"arr2":[3,4]}';
        const result = parseLogSamples(content);

        expect(result.detectedFormat).toBe('ndjson');
        expect(result.samples).toHaveLength(1);
        expect(result.error).toBeUndefined();
      });

      it('returns NOT_OBJECT error for NDJSON with non-object entries', () => {
        const content = '"string1"\n"string2"\n"string3"';
        const result = parseLogSamples(content);

        expect(result.samples).toHaveLength(0);
        expect(result.error).toBe('NOT_OBJECT');
      });

      it('returns NOT_OBJECT error for JSON array with primitive entries', () => {
        const content = '[1, 2, 3, 4, 5]';
        const result = parseLogSamples(content);

        expect(result.samples).toHaveLength(0);
        expect(result.error).toBe('NOT_OBJECT');
      });

      it('returns NOT_OBJECT error for JSON array with mixed entries', () => {
        const content = '[{"valid": "object"}, "string", 123]';
        const result = parseLogSamples(content);

        expect(result.samples).toHaveLength(0);
        expect(result.error).toBe('NOT_OBJECT');
      });
    });
  });

  describe('getFormatDescription', () => {
    it('returns correct descriptions', () => {
      expect(getFormatDescription('ndjson')).toBe('Newline-delimited JSON (NDJSON)');
      expect(getFormatDescription('ndjson_multiline')).toBe('Multi-line JSON objects');
      expect(getFormatDescription('json_array')).toBe('JSON array');
      expect(getFormatDescription('line_based')).toBe('Line-based logs');
    });
  });
});
