/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createNdjsonFormatter,
  createJsonFormatter,
  createCsvFormatter,
  createFormatter,
} from './format_results';
import type { ExportMetadata } from './format_results';

const metadata: ExportMetadata = {
  action_id: 'test-action-123',
  query: 'SELECT pid, name FROM processes',
  timestamp: '2024-01-01T00:00:00.000Z',
  exported_by: 'analyst@elastic.co',
  format: 'ndjson',
  total_results: 42,
};

const record1 = { 'osquery.pid': 1234, 'osquery.name': 'kibana', 'agent.name': 'host-1' };
const record2 = { 'osquery.pid': 5678, 'osquery.name': 'elastic-agent', 'agent.name': 'host-2' };

describe('format_results', () => {
  describe('createNdjsonFormatter', () => {
    it('writes metadata as first line', () => {
      const formatter = createNdjsonFormatter();
      const opening = formatter.opening(metadata);
      expect(opening).not.toBeNull();
      const parsed = JSON.parse(opening!);
      expect(parsed._meta.action_id).toBe('test-action-123');
      expect(parsed._meta.total_results).toBe(42);
    });

    it('writes one JSON line per row', () => {
      const formatter = createNdjsonFormatter();
      const line = formatter.row(record1, true);
      expect(line).toBe(JSON.stringify(record1) + '\n');
    });

    it('has no closing', () => {
      const formatter = createNdjsonFormatter();
      expect(formatter.closing()).toBeNull();
    });

    it('has correct content type and extension', () => {
      const formatter = createNdjsonFormatter();
      expect(formatter.contentType).toBe('application/ndjson');
      expect(formatter.fileExtension).toBe('ndjson');
    });
  });

  describe('createJsonFormatter', () => {
    it('writes valid JSON array wrapper', () => {
      const formatter = createJsonFormatter();
      const opening = formatter.opening(metadata);
      expect(opening).toContain('"_meta"');
      expect(opening).toContain('"results":[');
    });

    it('does not prepend comma to first row', () => {
      const formatter = createJsonFormatter();
      const line = formatter.row(record1, true);
      expect(line).not.toMatch(/^,/);
      expect(line).toBe(JSON.stringify(record1) + '\n');
    });

    it('prepends comma to subsequent rows', () => {
      const formatter = createJsonFormatter();
      const line = formatter.row(record2, false);
      expect(line).toBe(',' + JSON.stringify(record2) + '\n');
    });

    it('produces valid JSON when combined', () => {
      const formatter = createJsonFormatter();
      const output =
        formatter.opening(metadata)! +
        formatter.row(record1, true) +
        formatter.row(record2, false) +
        formatter.closing()!;
      const parsed = JSON.parse(output);
      expect(parsed._meta.action_id).toBe('test-action-123');
      expect(parsed.results).toHaveLength(2);
      expect(parsed.results[0]['osquery.pid']).toBe(1234);
    });

    it('produces valid JSON with empty results', () => {
      const formatter = createJsonFormatter();
      const output = formatter.opening(metadata)! + formatter.closing()!;
      const parsed = JSON.parse(output);
      expect(parsed.results).toEqual([]);
    });

    it('has correct content type and extension', () => {
      const formatter = createJsonFormatter();
      expect(formatter.contentType).toBe('application/json');
      expect(formatter.fileExtension).toBe('json');
    });
  });

  describe('createCsvFormatter', () => {
    it('returns null from opening when metadata format is not csv', () => {
      const formatter = createCsvFormatter();
      expect(formatter.opening(metadata)).toBeNull();
    });

    it('emits header-only CSV when total_results is zero and csv_columns is set', () => {
      const formatter = createCsvFormatter();
      formatter.finalizeColumns?.([]);
      const csvMeta: ExportMetadata = {
        action_id: 'a1',
        timestamp: '2024-01-01T00:00:00.000Z',
        exported_by: 'user',
        format: 'csv',
        total_results: 0,
        csv_columns: ['agent.name', 'process.pid'],
      };
      expect(formatter.opening(csvMeta)).toBe('agent.name,process.pid\n');
    });

    it('returns null from closing (CSV is data-only)', () => {
      const formatter = createCsvFormatter();
      formatter.opening(metadata);
      formatter.row(record1, true);
      expect(formatter.closing()).toBeNull();
    });

    it('emits only data when opening/row/closing are combined', () => {
      const formatter = createCsvFormatter();
      const opening = formatter.opening(metadata);
      const firstRow = formatter.row(record1, true);
      const secondRow = formatter.row(record2, false);
      const closing = formatter.closing();

      const output = (opening ?? '') + firstRow + secondRow + (closing ?? '');
      const lines = output.split('\n').filter(Boolean);

      expect(lines).toEqual([
        'osquery.pid,osquery.name,agent.name',
        '1234,kibana,host-1',
        '5678,elastic-agent,host-2',
      ]);
      expect(output).not.toContain('_export.');
      expect(output).not.toContain('_meta');
    });

    it('writes header row on first data row', () => {
      const formatter = createCsvFormatter();
      formatter.opening(metadata);
      const row = formatter.row(record1, true);
      const lines = row.split('\n').filter(Boolean);
      expect(lines[0]).toBe('osquery.pid,osquery.name,agent.name');
      expect(lines[1]).toBe('1234,kibana,host-1');
    });

    it('writes data without header on subsequent rows', () => {
      const formatter = createCsvFormatter();
      formatter.opening(metadata);
      formatter.row(record1, true); // sets columns
      const row = formatter.row(record2, false);
      expect(row).toBe('5678,elastic-agent,host-2\n');
    });

    it('uses first-page column union order from finalizeColumns', () => {
      const formatter = createCsvFormatter();
      formatter.finalizeColumns?.([
        { a: 'r1a', b: 'r1b' },
        { b: 'r2b', c: 'r2c' },
      ]);

      const first = formatter.row({ b: 'rXb', c: 'rXc', a: 'rXa' }, true);
      const next = formatter.row({ a: 'n1', c: 'n3' }, false);

      expect(first).toBe('a,b,c\nrXa,rXb,rXc\n');
      expect(next).toBe('n1,,n3\n');
    });

    it('escapes fields with commas', () => {
      const formatter = createCsvFormatter();
      const row = formatter.row({ field: 'value,with,commas' }, true);
      expect(row).toContain('"value,with,commas"');
    });

    it('escapes fields with double quotes', () => {
      const formatter = createCsvFormatter();
      const row = formatter.row({ field: 'value "with" quotes' }, true);
      expect(row).toContain('"value ""with"" quotes"');
    });

    it('quotes object values and escapes embedded newlines', () => {
      const formatter = createCsvFormatter();
      const row = formatter.row({ field: { note: 'line1\nline2' } }, true);
      const lines = row.split('\n').filter(Boolean);
      expect(lines[0]).toBe('field');
      expect(lines[1]).toContain('"{""note"":""line1\\nline2""}"');
    });

    it('handles null and undefined values', () => {
      const formatter = createCsvFormatter();
      const row = formatter.row({ a: null, b: undefined, c: '' }, true);
      const lines = row.split('\n').filter(Boolean);
      expect(lines[1]).toBe(',,');
    });

    it('has correct content type and extension', () => {
      const formatter = createCsvFormatter();
      expect(formatter.contentType).toBe('text/csv');
      expect(formatter.fileExtension).toBe('csv');
    });

    describe('formula injection mitigation', () => {
      it('prefixes a single-quote on cells starting with =', () => {
        const formatter = createCsvFormatter();
        const row = formatter.row({ field: '=SUM(A1:A2)' }, true);
        const lines = row.split('\n').filter(Boolean);
        expect(lines[1]).toBe("'=SUM(A1:A2)");
      });

      it.each([
        ['+', '+1234'],
        ['-', '-1234'],
        ['@', '@user'],
        ['\t', '\t tab'],
      ])('prefixes a single-quote on cells starting with %s', (_label, value) => {
        const formatter = createCsvFormatter();
        const row = formatter.row({ field: value }, true);
        expect(row).toContain(`'${value}`);
      });

      it('still quotes when the prefixed cell contains a comma', () => {
        const formatter = createCsvFormatter();
        const row = formatter.row({ field: '=HYPERLINK("http://evil.com","click,me")' }, true);
        expect(row).toContain('"\'=HYPERLINK');
      });

      it('does not prefix plain numeric cells', () => {
        const formatter = createCsvFormatter();
        const row = formatter.row({ field: '1234' }, true);
        const lines = row.split('\n').filter(Boolean);
        expect(lines[1]).toBe('1234');
      });

      it('applies the formula-injection prefix to header columns', () => {
        const formatter = createCsvFormatter();
        formatter.finalizeColumns?.([{ '=evil_col': 'val' }]);
        const row = formatter.row({ '=evil_col': 'val' }, true);
        const lines = row.split('\n').filter(Boolean);
        expect(lines[0]).toContain("'=evil_col");
      });
    });
  });

  describe('createFormatter', () => {
    it('returns ndjson formatter', () => {
      const formatter = createFormatter('ndjson');
      expect(formatter.contentType).toBe('application/ndjson');
    });

    it('returns json formatter', () => {
      const formatter = createFormatter('json');
      expect(formatter.contentType).toBe('application/json');
    });

    it('returns csv formatter', () => {
      const formatter = createFormatter('csv');
      expect(formatter.contentType).toBe('text/csv');
    });
  });
});
