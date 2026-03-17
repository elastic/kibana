/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';

jest.mock('../../generation/schema_walker', () => ({
  generateTestsFromToolSchema: jest.fn(() => [
    { input: { query: 'test1' }, expected: { result: 'ok' } },
    { input: { query: 'test2' }, expected: { result: 'ok' } },
  ]),
}));

import { generateCmd } from './generate';
import { generateTestsFromToolSchema } from '../../generation/schema_walker';

const mockGenerate = generateTestsFromToolSchema as jest.MockedFunction<
  typeof generateTestsFromToolSchema
>;

const createMockLog = () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  success: jest.fn(),
  write: jest.fn(),
});

const createMockFlagsReader = (flags: Record<string, string | boolean | undefined> = {}) => ({
  string: jest.fn((key: string) => {
    const val = flags[key];
    return typeof val === 'string' ? val : undefined;
  }),
  boolean: jest.fn((key: string) => {
    const val = flags[key];
    return typeof val === 'boolean' ? val : false;
  }),
  enum: jest.fn(),
  stringArray: jest.fn(),
  path: jest.fn(),
  number: jest.fn(),
});

describe('generateCmd', () => {
  const tmpDir = Path.join(__dirname, '__tmp_generate_test__');
  const schemaFile = Path.join(tmpDir, 'tool_schema.json');
  const outputFile = Path.join(tmpDir, 'output.json');
  const originalStdoutWrite = process.stdout.write;

  beforeAll(() => {
    Fs.mkdirSync(tmpDir, { recursive: true });
    Fs.writeFileSync(
      schemaFile,
      JSON.stringify({
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      })
    );
  });

  afterAll(() => {
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.stdout.write = jest.fn() as any;
    if (Fs.existsSync(outputFile)) {
      Fs.unlinkSync(outputFile);
    }
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
  });

  describe('metadata', () => {
    it('has the correct command name', () => {
      expect(generateCmd.name).toBe('generate');
    });

    it('defines string flags', () => {
      expect(generateCmd.flags?.string).toEqual(
        expect.arrayContaining(['schema', 'count', 'difficulty', 'output'])
      );
    });

    it('defaults count to 10 and difficulty to moderate', () => {
      expect(generateCmd.flags?.default).toEqual(
        expect.objectContaining({ count: '10', difficulty: 'moderate' })
      );
    });
  });

  describe('flag validation', () => {
    it('throws when --schema is missing', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      await expect(generateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        'Missing --schema'
      );
    });

    it('throws when schema file does not exist', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ schema: '/nonexistent/path.json' });

      await expect(generateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        'Schema file not found'
      );
    });

    it('throws for invalid --count', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ schema: schemaFile, count: 'abc' });

      await expect(generateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        '--count must be a positive integer'
      );
    });

    it('throws for zero --count', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ schema: schemaFile, count: '0' });

      await expect(generateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        '--count must be a positive integer'
      );
    });

    it('throws for invalid --difficulty', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ schema: schemaFile, difficulty: 'extreme' });

      await expect(generateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        '--difficulty must be one of: simple, moderate, complex'
      );
    });

    it('throws for unparseable JSON schema', async () => {
      const badFile = Path.join(tmpDir, 'bad.json');
      Fs.writeFileSync(badFile, 'not json');
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ schema: badFile });

      await expect(generateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        'Failed to parse schema file as JSON'
      );
    });
  });

  describe('generation', () => {
    it('calls generateTestsFromToolSchema with parsed schema and options', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        schema: schemaFile,
        count: '5',
        difficulty: 'complex',
      });

      await generateCmd.run({ log, flagsReader } as any);

      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'object', properties: { query: { type: 'string' } } }),
        { count: 5, difficulty: 'complex' }
      );
    });

    it('uses default count and difficulty when omitted', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ schema: schemaFile });

      await generateCmd.run({ log, flagsReader } as any);

      expect(mockGenerate).toHaveBeenCalledWith(expect.any(Object), {
        count: 10,
        difficulty: 'moderate',
      });
    });

    it('logs the number of generated examples', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ schema: schemaFile });

      await generateCmd.run({ log, flagsReader } as any);

      const generated = log.info.mock.calls.find(
        (call: string[]) => typeof call[0] === 'string' && call[0].includes('Generated 2 examples')
      );
      expect(generated).toBeDefined();
    });
  });

  describe('output', () => {
    it('writes to stdout when --output is not provided', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ schema: schemaFile });

      await generateCmd.run({ log, flagsReader } as any);

      expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining('"query"'));
    });

    it('writes to file when --output is provided', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        schema: schemaFile,
        output: outputFile,
      });

      await generateCmd.run({ log, flagsReader } as any);

      expect(Fs.existsSync(outputFile)).toBe(true);
      const content = JSON.parse(Fs.readFileSync(outputFile, 'utf-8'));
      expect(content).toHaveLength(2);
    });

    it('logs the output file path when writing to file', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        schema: schemaFile,
        output: outputFile,
      });

      await generateCmd.run({ log, flagsReader } as any);

      const writeLog = log.info.mock.calls.find(
        (call: string[]) => typeof call[0] === 'string' && call[0].includes('Wrote 2 examples')
      );
      expect(writeLog).toBeDefined();
    });
  });
});
