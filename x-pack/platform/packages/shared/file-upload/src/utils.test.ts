/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILE_FORMATS, NO_TIME_FORMAT } from '@kbn/file-upload-common';
import type { AnalysisResult, InputOverrides } from '@kbn/file-upload-common';
import {
  createUrlOverrides,
  DEFAULT_LINES_TO_SAMPLE,
  isSupportedFormat,
  looksLikeNdjson,
  processResults,
  readFile,
  removeCorruptedTrailingNdjsonDoc,
} from './utils';

// Keep UPLOAD_SIZE_MB * MB small so truncate tests do not need multi-MB buffers.
jest.mock('@kbn/file-upload-common', () => ({
  ...jest.requireActual('@kbn/file-upload-common'),
  MB: 20,
}));

const UPLOAD_SIZE_BYTES = 5 * 20;

function createFileFromBytes(bytes: Uint8Array, name = 'test.ndjson'): File {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: async () => buffer,
  } as unknown as File;
}

function createFileFromString(contents: string, name = 'test.txt'): File {
  return createFileFromBytes(new TextEncoder().encode(contents), name);
}

class MockFileReader {
  public result: ArrayBuffer | string | null = null;
  public onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null;

  public readAsArrayBuffer(blob: Blob): void {
    Promise.resolve((blob as File).arrayBuffer()).then((buffer) => {
      this.result = buffer;
      this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
    });
  }
}

describe('utils', () => {
  describe('looksLikeNdjson', () => {
    it('returns true when the first lines are valid JSON objects', () => {
      const contents = ['{"a":1}', '{"b":2}', '{"c":3}'].join('\n');
      expect(looksLikeNdjson(contents)).toBe(true);
    });

    it('returns false for empty or blank content', () => {
      expect(looksLikeNdjson('')).toBe(false);
      expect(looksLikeNdjson('\n\n')).toBe(false);
    });

    it('returns false when a sampled line is not JSON', () => {
      const contents = ['{"a":1}', 'not-json', '{"c":3}'].join('\n');
      expect(looksLikeNdjson(contents)).toBe(false);
    });

    it('ignores blank lines when sampling', () => {
      const contents = ['{"a":1}', '', '  ', '{"b":2}'].join('\n');
      expect(looksLikeNdjson(contents)).toBe(true);
    });

    it('only samples the first few lines', () => {
      const lines = [
        '{"a":1}',
        '{"b":2}',
        '{"c":3}',
        '{"d":4}',
        '{"e":5}',
        '{"f":6}',
        '{"g":7}',
        '{"h":8}',
        '{"i":9}',
        '{"j":10}',
        'not-json-but-beyond-sample',
      ];
      expect(looksLikeNdjson(lines.join('\n'))).toBe(true);
    });

    it('excludes the last line from detection when excludeLastLine is true', () => {
      const contents = ['{"a":1}', '{"b":2}', '{"incomplete":'].join('\n');
      expect(looksLikeNdjson(contents)).toBe(false);
      expect(looksLikeNdjson(contents, true)).toBe(true);
    });

    it('returns false when excludeLastLine leaves no lines to sample', () => {
      expect(looksLikeNdjson('', true)).toBe(false);
      expect(looksLikeNdjson('\n', true)).toBe(false);
    });

    it('still samples a single line when excludeLastLine is true', () => {
      expect(looksLikeNdjson('{"a":1}', true)).toBe(true);
      expect(looksLikeNdjson('{"incomplete":', true)).toBe(false);
    });
  });

  describe('removeCorruptedTrailingNdjsonDoc', () => {
    it('returns content unchanged when the trailing segment is valid JSON', () => {
      const contents = '{"a":1}\n{"b":2}';
      expect(removeCorruptedTrailingNdjsonDoc(contents)).toBe(contents);
    });

    it('returns content unchanged when it ends with a newline after a complete doc', () => {
      const contents = '{"a":1}\n{"b":2}\n';
      expect(removeCorruptedTrailingNdjsonDoc(contents)).toBe(contents);
    });

    it('drops a corrupted trailing segment after the last newline', () => {
      const contents = '{"a":1}\n{"b":2}\n{"incomplete":';
      expect(removeCorruptedTrailingNdjsonDoc(contents)).toBe('{"a":1}\n{"b":2}');
    });

    it('handles CRLF by stripping a trailing carriage return before parsing', () => {
      expect(removeCorruptedTrailingNdjsonDoc('{"a":1}\n{"b":2}\r')).toBe('{"a":1}\n{"b":2}\r');
      expect(removeCorruptedTrailingNdjsonDoc('{"a":1}\n{"incomplete":\r')).toBe('{"a":1}');
    });

    it('returns the full string when there is no newline and content is valid JSON', () => {
      expect(removeCorruptedTrailingNdjsonDoc('{"a":1}')).toBe('{"a":1}');
    });

    it('returns an empty string when there is no newline and content is not JSON', () => {
      expect(removeCorruptedTrailingNdjsonDoc('{"incomplete":')).toBe('');
    });
  });

  describe('isSupportedFormat', () => {
    it('returns true for supported formats', () => {
      expect(isSupportedFormat(FILE_FORMATS.NDJSON)).toBe(true);
      expect(isSupportedFormat(FILE_FORMATS.DELIMITED)).toBe(true);
      expect(isSupportedFormat(FILE_FORMATS.SEMI_STRUCTURED_TEXT)).toBe(true);
      expect(isSupportedFormat(FILE_FORMATS.TIKA)).toBe(true);
    });

    it('returns false for unsupported formats', () => {
      expect(isSupportedFormat('xml')).toBe(false);
      expect(isSupportedFormat('')).toBe(false);
    });
  });

  describe('createUrlOverrides', () => {
    it('omits values that match the original settings', () => {
      const result = createUrlOverrides(
        { format: FILE_FORMATS.DELIMITED, delimiter: ',' },
        { format: FILE_FORMATS.DELIMITED, delimiter: ',' }
      );

      expect(result.format).toBe('');
      expect(result.delimiter).toBe('');
    });

    it('keeps changed override values in snake_case', () => {
      const result = createUrlOverrides(
        { format: FILE_FORMATS.DELIMITED, hasHeaderRow: 'true' },
        { format: FILE_FORMATS.DELIMITED, hasHeaderRow: 'false' }
      );

      expect(result.has_header_row).toBe('true');
      expect(result.format).toBe(FILE_FORMATS.DELIMITED);
    });

    it('restores delimited format when related overrides differ', () => {
      const result = createUrlOverrides(
        { delimiter: ';' },
        { format: FILE_FORMATS.DELIMITED, delimiter: ',' }
      );

      expect(result.format).toBe(FILE_FORMATS.DELIMITED);
      expect(result.delimiter).toBe(';');
    });

    it('joins delimited column names into a comma-separated string', () => {
      const result = createUrlOverrides(
        // Runtime callers may pass a string[]; createUrlOverrides joins arrays.
        { format: FILE_FORMATS.DELIMITED, columnNames: ['a', 'b'] } as unknown as InputOverrides,
        { format: FILE_FORMATS.SEMI_STRUCTURED_TEXT }
      );

      expect(result.column_names).toBe('a,b');
    });

    it('clears delimited-only overrides for NDJSON', () => {
      const result = createUrlOverrides(
        {
          format: FILE_FORMATS.NDJSON,
          shouldTrimFields: 'true',
          hasHeaderRow: 'true',
          delimiter: ',',
          quote: '"',
          columnNames: 'a',
        },
        { format: FILE_FORMATS.DELIMITED }
      );

      expect(result.format).toBe(FILE_FORMATS.NDJSON);
      expect(result.should_trim_fields).toBe('');
      expect(result.has_header_row).toBe('');
      expect(result.delimiter).toBe('');
      expect(result.quote).toBe('');
      expect(result.column_names).toBe('');
    });

    it('restores lines_to_sample from camelCase overrides when blank', () => {
      const result = createUrlOverrides({ linesToSample: '50' }, { linesToSample: '1000' });

      expect(result.lines_to_sample).toBe('50');
    });
  });

  describe('processResults', () => {
    const baseResults = {
      format: FILE_FORMATS.DELIMITED,
      delimiter: ',',
      timestamp_field: '@timestamp',
      java_timestamp_formats: ['ISO8601'],
      quote: '"',
      has_header_row: true,
      should_trim_fields: false,
      charset: 'UTF-8',
      column_names: ['a', 'b'],
      grok_pattern: undefined,
    } as AnalysisResult['results'];

    it('uses the first java timestamp format when present', () => {
      const result = processResults({ results: baseResults });

      expect(result.timestampFormat).toBe('ISO8601');
      expect(result.linesToSample).toBe(DEFAULT_LINES_TO_SAMPLE);
      expect(result.format).toBe(FILE_FORMATS.DELIMITED);
      expect(result.timestampField).toBe('@timestamp');
    });

    it('uses NO_TIME_FORMAT when overrides request it', () => {
      const result = processResults({
        results: baseResults,
        overrides: { timestamp_format: NO_TIME_FORMAT },
      });

      expect(result.timestampFormat).toBe(NO_TIME_FORMAT);
    });

    it('uses NO_TIME_FORMAT when java timestamp formats are missing', () => {
      const result = processResults({
        results: { ...baseResults, java_timestamp_formats: undefined },
      });

      expect(result.timestampFormat).toBe(NO_TIME_FORMAT);
    });

    it('prefers overrides.lines_to_sample when provided', () => {
      const result = processResults({
        results: baseResults,
        overrides: { lines_to_sample: '25' },
      });

      expect(result.linesToSample).toBe('25');
    });
  });

  describe('readFile', () => {
    const originalFileReader = global.FileReader;

    beforeEach(() => {
      global.FileReader = MockFileReader as unknown as typeof FileReader;
    });

    afterEach(() => {
      global.FileReader = originalFileReader;
    });

    it('rejects when the file is missing or empty', async () => {
      await expect(readFile(undefined as unknown as File)).rejects.toBeUndefined();
      await expect(readFile({ size: 0 } as File)).rejects.toBeUndefined();
    });

    it('returns the full contents for files within the upload size limit', async () => {
      const contents = '{"a":1}\n{"b":2}\n';
      const { fileContents, data } = await readFile(createFileFromString(contents));

      expect(fileContents).toBe(contents);
      expect(data.byteLength).toBe(contents.length);
    });

    it('truncates large NDJSON samples and drops a corrupted trailing document', async () => {
      const completeDocs = Array.from({ length: 20 }, (_, i) =>
        JSON.stringify({ id: i, value: 'x'.repeat(8) })
      ).join('\n');
      // Ensure payload exceeds the mocked upload size, then append a cut-off JSON object.
      const padding = 'y'.repeat(Math.max(0, UPLOAD_SIZE_BYTES - completeDocs.length + 10));
      const truncatedJsonPrefix = `{"incomplete":"${padding}`;
      const fileBytes = new TextEncoder().encode(`${completeDocs}\n${truncatedJsonPrefix}`);
      expect(fileBytes.byteLength).toBeGreaterThan(UPLOAD_SIZE_BYTES);

      const { fileContents } = await readFile(createFileFromBytes(fileBytes));

      expect(fileContents.length).toBeLessThanOrEqual(UPLOAD_SIZE_BYTES);
      expect(fileContents.includes('{"incomplete":')).toBe(false);
      // Surviving content should still look like NDJSON.
      const lines = fileContents.split('\n').filter((line) => line.trim() !== '');
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    it('keeps a complete trailing NDJSON document after truncation', async () => {
      const docs: string[] = [];
      while (docs.join('\n').length < UPLOAD_SIZE_BYTES + 50) {
        docs.push(JSON.stringify({ id: docs.length, msg: 'hello' }));
      }
      const contents = `${docs.join('\n')}\n`;
      const fileBytes = new TextEncoder().encode(contents);
      expect(fileBytes.byteLength).toBeGreaterThan(UPLOAD_SIZE_BYTES);

      const { fileContents } = await readFile(createFileFromBytes(fileBytes));
      const lastNewline = fileContents.lastIndexOf('\n');
      const trailing =
        lastNewline === -1 ? fileContents : fileContents.slice(lastNewline + 1).replace(/\r$/, '');

      if (trailing.trim() !== '') {
        expect(() => JSON.parse(trailing)).not.toThrow();
      } else {
        // Truncate landed on a newline after a complete doc.
        const previousLine = fileContents.slice(0, lastNewline).split('\n').pop()!;
        expect(() => JSON.parse(previousLine)).not.toThrow();
      }
    });

    it('does not strip trailing content for truncated non-NDJSON files', async () => {
      const header = 'col1,col2\n';
      const rows = Array.from({ length: 50 }, (_, i) => `value${i},other${i}`).join('\n');
      const contents = `${header}${rows},partial`;
      const fileBytes = new TextEncoder().encode(contents);
      expect(fileBytes.byteLength).toBeGreaterThan(UPLOAD_SIZE_BYTES);

      const { fileContents } = await readFile(createFileFromBytes(fileBytes, 'test.csv'));
      const expected = new TextDecoder().decode(fileBytes.slice(0, UPLOAD_SIZE_BYTES));

      expect(fileContents).toBe(expected);
    });
  });
});
