/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseMode,
  parseOutputFormat,
  parseEvalsCliFlags,
  isValidMode,
  isValidOutputFormat,
  VALID_MODES,
  VALID_OUTPUT_FORMATS,
  EVALS_CLI_FLAG_OPTIONS,
} from './flags';

describe('EVALS_CLI_FLAG_OPTIONS', () => {
  it('defines string flags', () => {
    expect(EVALS_CLI_FLAG_OPTIONS.string).toEqual([
      'config',
      'mode',
      'schedule',
      'output',
      'connector-id',
      'model',
    ]);
  });

  it('defines boolean flags', () => {
    expect(EVALS_CLI_FLAG_OPTIONS.boolean).toEqual(['verbose', 'dry-run']);
  });

  it('defines default values', () => {
    expect(EVALS_CLI_FLAG_OPTIONS.default).toEqual({
      mode: 'once',
      output: 'table',
      verbose: false,
      'dry-run': false,
    });
  });

  it('defines aliases', () => {
    expect(EVALS_CLI_FLAG_OPTIONS.alias).toEqual({
      c: 'config',
      m: 'mode',
      s: 'schedule',
      o: 'output',
      v: 'verbose',
      n: 'dry-run',
    });
  });

  it('includes help text', () => {
    expect(EVALS_CLI_FLAG_OPTIONS.help).toContain('--config');
    expect(EVALS_CLI_FLAG_OPTIONS.help).toContain('--mode');
    expect(EVALS_CLI_FLAG_OPTIONS.help).toContain('--schedule');
    expect(EVALS_CLI_FLAG_OPTIONS.help).toContain('--output');
    expect(EVALS_CLI_FLAG_OPTIONS.help).toContain('--connector-id');
    expect(EVALS_CLI_FLAG_OPTIONS.help).toContain('--model');
    expect(EVALS_CLI_FLAG_OPTIONS.help).toContain('--verbose');
    expect(EVALS_CLI_FLAG_OPTIONS.help).toContain('--dry-run');
  });
});

describe('parseMode', () => {
  it('returns default mode "once" when undefined', () => {
    expect(parseMode(undefined)).toBe('once');
  });

  it.each(VALID_MODES)('accepts valid mode "%s"', (mode) => {
    expect(parseMode(mode)).toBe(mode);
  });

  it('throws for invalid mode', () => {
    expect(() => parseMode('invalid')).toThrow(
      'Invalid --mode value "invalid". Expected one of: once, continuous, scheduled, git-hook'
    );
  });

  it('throws for empty string mode', () => {
    expect(() => parseMode('')).toThrow(
      'Invalid --mode value "". Expected one of: once, continuous, scheduled, git-hook'
    );
  });

  it('is case-sensitive', () => {
    expect(() => parseMode('ONCE')).toThrow(
      'Invalid --mode value "ONCE". Expected one of: once, continuous, scheduled, git-hook'
    );
    expect(() => parseMode('Once')).toThrow(
      'Invalid --mode value "Once". Expected one of: once, continuous, scheduled, git-hook'
    );
  });

  it('does not trim whitespace', () => {
    expect(() => parseMode(' once')).toThrow('Invalid --mode value " once"');
    expect(() => parseMode('once ')).toThrow('Invalid --mode value "once "');
  });
});

describe('parseOutputFormat', () => {
  it('returns default format "table" when undefined', () => {
    expect(parseOutputFormat(undefined)).toBe('table');
  });

  it.each(VALID_OUTPUT_FORMATS)('accepts valid format "%s"', (format) => {
    expect(parseOutputFormat(format)).toBe(format);
  });

  it('throws for invalid format', () => {
    expect(() => parseOutputFormat('invalid')).toThrow(
      'Invalid --output value "invalid". Expected one of: json, table, markdown, silent'
    );
  });

  it('throws for empty string format', () => {
    expect(() => parseOutputFormat('')).toThrow(
      'Invalid --output value "". Expected one of: json, table, markdown, silent'
    );
  });

  it('is case-sensitive', () => {
    expect(() => parseOutputFormat('JSON')).toThrow(
      'Invalid --output value "JSON". Expected one of: json, table, markdown, silent'
    );
    expect(() => parseOutputFormat('Table')).toThrow(
      'Invalid --output value "Table". Expected one of: json, table, markdown, silent'
    );
  });

  it('does not trim whitespace', () => {
    expect(() => parseOutputFormat(' json')).toThrow('Invalid --output value " json"');
    expect(() => parseOutputFormat('table ')).toThrow('Invalid --output value "table "');
  });
});

describe('parseEvalsCliFlags', () => {
  it('parses minimal flags with defaults', () => {
    const result = parseEvalsCliFlags({});

    expect(result).toEqual({
      config: undefined,
      mode: 'once',
      schedule: undefined,
      output: 'table',
      connectorId: undefined,
      model: undefined,
      verbose: false,
      dryRun: false,
    });
  });

  it('parses all flags', () => {
    const result = parseEvalsCliFlags({
      config: './my-config.ts',
      mode: 'continuous',
      schedule: '0 * * * *',
      output: 'json',
      'connector-id': 'my-connector',
      model: 'gpt-4',
      verbose: true,
      'dry-run': true,
    });

    expect(result).toEqual({
      config: './my-config.ts',
      mode: 'continuous',
      schedule: '0 * * * *',
      output: 'json',
      connectorId: 'my-connector',
      model: 'gpt-4',
      verbose: true,
      dryRun: true,
    });
  });

  it('requires schedule for scheduled mode', () => {
    expect(() =>
      parseEvalsCliFlags({
        mode: 'scheduled',
      })
    ).toThrow('--schedule is required when using --mode scheduled');
  });

  it('allows schedule for scheduled mode', () => {
    const result = parseEvalsCliFlags({
      mode: 'scheduled',
      schedule: '*/5 * * * *',
    });

    expect(result.mode).toBe('scheduled');
    expect(result.schedule).toBe('*/5 * * * *');
  });

  it('handles boolean flags as truthy values', () => {
    const result = parseEvalsCliFlags({
      verbose: 1,
      'dry-run': 'true',
    });

    expect(result.verbose).toBe(true);
    expect(result.dryRun).toBe(true);
  });

  it('handles boolean flags as falsy values', () => {
    const result = parseEvalsCliFlags({
      verbose: 0,
      'dry-run': '',
    });

    expect(result.verbose).toBe(false);
    expect(result.dryRun).toBe(false);
  });

  it('allows schedule to be provided for non-scheduled modes (ignored)', () => {
    const result = parseEvalsCliFlags({
      mode: 'once',
      schedule: '0 * * * *',
    });

    expect(result.mode).toBe('once');
    expect(result.schedule).toBe('0 * * * *');
  });

  it('parses git-hook mode without schedule requirement', () => {
    const result = parseEvalsCliFlags({
      mode: 'git-hook',
    });

    expect(result.mode).toBe('git-hook');
    expect(result.schedule).toBeUndefined();
  });

  it('parses continuous mode without schedule requirement', () => {
    const result = parseEvalsCliFlags({
      mode: 'continuous',
    });

    expect(result.mode).toBe('continuous');
    expect(result.schedule).toBeUndefined();
  });

  it('handles undefined optional string flags', () => {
    const result = parseEvalsCliFlags({
      config: undefined,
      'connector-id': undefined,
      model: undefined,
      schedule: undefined,
    });

    expect(result.config).toBeUndefined();
    expect(result.connectorId).toBeUndefined();
    expect(result.model).toBeUndefined();
    expect(result.schedule).toBeUndefined();
  });

  it('preserves config path with special characters', () => {
    const result = parseEvalsCliFlags({
      config: './path/to/my-config.ts',
    });
    expect(result.config).toBe('./path/to/my-config.ts');
  });

  it('preserves connector-id with special characters', () => {
    const result = parseEvalsCliFlags({
      'connector-id': 'my-org/connector-123',
    });
    expect(result.connectorId).toBe('my-org/connector-123');
  });

  it('preserves model name with various formats', () => {
    const result = parseEvalsCliFlags({
      model: 'gpt-4-turbo-preview',
    });
    expect(result.model).toBe('gpt-4-turbo-preview');
  });

  it('throws for invalid mode combined with valid flags', () => {
    expect(() =>
      parseEvalsCliFlags({
        config: './config.ts',
        mode: 'invalid-mode',
        output: 'json',
      })
    ).toThrow('Invalid --mode value "invalid-mode"');
  });

  it('throws for invalid output format combined with valid flags', () => {
    expect(() =>
      parseEvalsCliFlags({
        config: './config.ts',
        mode: 'once',
        output: 'csv',
      })
    ).toThrow('Invalid --output value "csv"');
  });

  it('converts null values appropriately', () => {
    const result = parseEvalsCliFlags({
      verbose: null,
      'dry-run': null,
    });

    expect(result.verbose).toBe(false);
    expect(result.dryRun).toBe(false);
  });
});

describe('isValidMode', () => {
  it.each(VALID_MODES)('returns true for valid mode "%s"', (mode) => {
    expect(isValidMode(mode)).toBe(true);
  });

  it('returns false for invalid mode', () => {
    expect(isValidMode('invalid')).toBe(false);
    expect(isValidMode(123)).toBe(false);
    expect(isValidMode(null)).toBe(false);
    expect(isValidMode(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidMode('')).toBe(false);
  });

  it('returns false for case variations', () => {
    expect(isValidMode('ONCE')).toBe(false);
    expect(isValidMode('Continuous')).toBe(false);
    expect(isValidMode('SCHEDULED')).toBe(false);
  });

  it('returns false for whitespace-padded values', () => {
    expect(isValidMode(' once')).toBe(false);
    expect(isValidMode('once ')).toBe(false);
    expect(isValidMode(' once ')).toBe(false);
  });

  it('returns false for object and array types', () => {
    expect(isValidMode({})).toBe(false);
    expect(isValidMode([])).toBe(false);
    expect(isValidMode({ mode: 'once' })).toBe(false);
  });

  it('returns false for boolean values', () => {
    expect(isValidMode(true)).toBe(false);
    expect(isValidMode(false)).toBe(false);
  });
});

describe('isValidOutputFormat', () => {
  it.each(VALID_OUTPUT_FORMATS)('returns true for valid format "%s"', (format) => {
    expect(isValidOutputFormat(format)).toBe(true);
  });

  it('returns false for invalid format', () => {
    expect(isValidOutputFormat('invalid')).toBe(false);
    expect(isValidOutputFormat(123)).toBe(false);
    expect(isValidOutputFormat(null)).toBe(false);
    expect(isValidOutputFormat(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidOutputFormat('')).toBe(false);
  });

  it('returns false for case variations', () => {
    expect(isValidOutputFormat('JSON')).toBe(false);
    expect(isValidOutputFormat('Table')).toBe(false);
    expect(isValidOutputFormat('MARKDOWN')).toBe(false);
  });

  it('returns false for whitespace-padded values', () => {
    expect(isValidOutputFormat(' json')).toBe(false);
    expect(isValidOutputFormat('table ')).toBe(false);
    expect(isValidOutputFormat(' markdown ')).toBe(false);
  });

  it('returns false for object and array types', () => {
    expect(isValidOutputFormat({})).toBe(false);
    expect(isValidOutputFormat([])).toBe(false);
    expect(isValidOutputFormat({ format: 'json' })).toBe(false);
  });

  it('returns false for boolean values', () => {
    expect(isValidOutputFormat(true)).toBe(false);
    expect(isValidOutputFormat(false)).toBe(false);
  });
});

describe('VALID_MODES constant', () => {
  it('contains expected modes', () => {
    expect(VALID_MODES).toContain('once');
    expect(VALID_MODES).toContain('continuous');
    expect(VALID_MODES).toContain('scheduled');
    expect(VALID_MODES).toContain('git-hook');
  });

  it('has exactly 4 modes', () => {
    expect(VALID_MODES).toHaveLength(4);
  });

  it('is readonly', () => {
    // TypeScript ensures this at compile time, but we verify structure
    expect(Array.isArray(VALID_MODES)).toBe(true);
  });
});

describe('VALID_OUTPUT_FORMATS constant', () => {
  it('contains expected formats', () => {
    expect(VALID_OUTPUT_FORMATS).toContain('json');
    expect(VALID_OUTPUT_FORMATS).toContain('table');
    expect(VALID_OUTPUT_FORMATS).toContain('markdown');
    expect(VALID_OUTPUT_FORMATS).toContain('silent');
  });

  it('has exactly 4 formats', () => {
    expect(VALID_OUTPUT_FORMATS).toHaveLength(4);
  });

  it('is readonly', () => {
    // TypeScript ensures this at compile time, but we verify structure
    expect(Array.isArray(VALID_OUTPUT_FORMATS)).toBe(true);
  });
});
