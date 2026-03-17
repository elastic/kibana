/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';

const mockGetStatsByRunId = jest.fn();
const mockGetDistinctRunCount = jest.fn();
const mockClose = jest.fn();

jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn(() => ({
    close: mockClose,
  })),
}));

jest.mock('../../utils/score_repository', () => ({
  EvaluationScoreRepository: jest.fn(() => ({
    getStatsByRunId: mockGetStatsByRunId,
    getDistinctRunCount: mockGetDistinctRunCount,
  })),
}));

jest.mock('../../quality_gates/calibrate', () => ({
  calibrateThresholds: jest.fn(),
}));

jest.mock('../../quality_gates/types', () => ({
  parseGateConfig: jest.fn((raw: string) => JSON.parse(raw)),
  serializeGateConfig: jest.fn((config: unknown) => JSON.stringify(config, null, 2)),
}));

import { Client as EsClient } from '@elastic/elasticsearch';
import { calibrateCmd } from './calibrate';
import { calibrateThresholds } from '../../quality_gates/calibrate';
import type { CalibrationResult } from '../../quality_gates/calibrate';

const MockClient = EsClient as unknown as jest.Mock;

const mockCalibrateThresholds = calibrateThresholds as jest.MockedFunction<
  typeof calibrateThresholds
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

const createMockCalibrationResult = (
  overrides: Partial<CalibrationResult> = {}
): CalibrationResult => ({
  config: {
    score: { avg: 0.85 },
    evaluators: {
      correctness: { min: 0.7, avg: 0.85 },
      relevance: { min: 0.65, avg: 0.82 },
    },
    required_pass: ['correctness', 'relevance'],
  },
  changes: [
    { evaluator: 'correctness', recommended: 0.85, reason: 'Bootstrap: mean=0.85' },
    { evaluator: 'relevance', recommended: 0.82, reason: 'Bootstrap: mean=0.82' },
  ],
  ...overrides,
});

describe('calibrateCmd', () => {
  const tmpDir = Path.join(__dirname, '__tmp_calibrate_test__');
  const configFile = Path.join(tmpDir, 'existing.json');
  const outputFile = Path.join(tmpDir, 'output.json');
  const originalEnv = { ...process.env };
  const originalStdoutWrite = process.stdout.write;

  beforeAll(() => {
    Fs.mkdirSync(tmpDir, { recursive: true });
    Fs.writeFileSync(
      configFile,
      JSON.stringify({
        score: { avg: 0.75 },
        evaluators: { correctness: { min: 0.6, avg: 0.8 } },
      })
    );
  });

  afterAll(() => {
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.stdout.write = jest.fn() as any;
    mockCalibrateThresholds.mockResolvedValue(createMockCalibrationResult());
    mockGetDistinctRunCount.mockResolvedValue(5);
    mockClose.mockResolvedValue(undefined);
    if (Fs.existsSync(outputFile)) {
      Fs.unlinkSync(outputFile);
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    process.stdout.write = originalStdoutWrite;
  });

  describe('metadata', () => {
    it('has the correct command name', () => {
      expect(calibrateCmd.name).toBe('calibrate');
    });

    it('defines string flags', () => {
      expect(calibrateCmd.flags?.string).toEqual(
        expect.arrayContaining([
          'run-id',
          'config',
          'output',
          'mode',
          'margin',
          'model',
          'suite',
          'min-runs',
        ])
      );
    });

    it('defaults mode to bootstrap, margin to 2, and min-runs to 3', () => {
      expect(calibrateCmd.flags?.default).toEqual(
        expect.objectContaining({ mode: 'bootstrap', margin: '2', 'min-runs': '3' })
      );
    });
  });

  describe('flag validation', () => {
    it('throws when --run-id is missing', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      await expect(calibrateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        'Missing --run-id'
      );
    });

    it('throws for invalid --mode', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc', mode: 'invalid' });

      await expect(calibrateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        '--mode must be "bootstrap" or "tighten"'
      );
    });

    it('throws for negative --margin', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc', margin: '-1' });

      await expect(calibrateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        '--margin must be a non-negative number'
      );
    });

    it('throws for non-numeric --margin', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc', margin: 'bad' });

      await expect(calibrateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        '--margin must be a non-negative number'
      );
    });

    it('throws when --config file does not exist', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'run-id': 'abc',
        config: '/nonexistent/config.json',
      });

      await expect(calibrateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        'Config file not found'
      );
    });

    it('throws for non-numeric --min-runs', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc', 'min-runs': 'bad' });

      await expect(calibrateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        '--min-runs must be a positive integer'
      );
    });

    it('throws for zero --min-runs', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc', 'min-runs': '0' });

      await expect(calibrateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        '--min-runs must be a positive integer'
      );
    });
  });

  describe('ES URL resolution', () => {
    it('uses EVALUATIONS_ES_URL when set', async () => {
      process.env.EVALUATIONS_ES_URL = 'http://custom-es:9200';
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      expect(MockClient).toHaveBeenCalledWith(
        expect.objectContaining({ node: 'http://custom-es:9200' })
      );
    });

    it('falls back to ES_URL when EVALUATIONS_ES_URL is not set', async () => {
      delete process.env.EVALUATIONS_ES_URL;
      process.env.ES_URL = 'http://es-fallback:9200';
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      expect(MockClient).toHaveBeenCalledWith(
        expect.objectContaining({ node: 'http://es-fallback:9200' })
      );
    });

    it('uses API key when EVALUATIONS_ES_API_KEY is set', async () => {
      process.env.EVALUATIONS_ES_API_KEY = 'test-key';
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      expect(MockClient).toHaveBeenCalledWith(
        expect.objectContaining({ auth: { apiKey: 'test-key' } })
      );
    });
  });

  describe('calibration execution', () => {
    it('passes correct options to calibrateThresholds', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'run-id': 'run-123',
        mode: 'tighten',
        margin: '1.5',
        model: 'gpt-4',
        suite: 'test-suite',
      });

      await calibrateCmd.run({ log, flagsReader } as any);

      expect(mockCalibrateThresholds).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          runId: 'run-123',
          mode: 'tighten',
          margin: 1.5,
          taskModelId: 'gpt-4',
          suiteId: 'test-suite',
        })
      );
    });

    it('passes existing config when --config is provided', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'run-id': 'run-123',
        config: configFile,
      });

      await calibrateCmd.run({ log, flagsReader } as any);

      expect(mockCalibrateThresholds).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          existingConfig: expect.objectContaining({
            score: { avg: 0.75 },
          }),
        })
      );
    });

    it('logs calibration info before running', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'run-xyz' });

      await calibrateCmd.run({ log, flagsReader } as any);

      const infoLog = log.info.mock.calls.find(
        (call: string[]) => typeof call[0] === 'string' && call[0].includes('run-xyz')
      );
      expect(infoLog).toBeDefined();
    });
  });

  describe('output', () => {
    it('writes config to stdout when --output is omitted', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      expect(process.stdout.write).toHaveBeenCalled();
      const output = (process.stdout.write as jest.Mock).mock.calls[0][0];
      expect(output).toContain('correctness');
    });

    it('writes config to file when --output is provided', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'run-id': 'abc',
        output: outputFile,
      });

      await calibrateCmd.run({ log, flagsReader } as any);

      expect(Fs.existsSync(outputFile)).toBe(true);
      const content = Fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('correctness');
    });

    it('logs changes when calibration produces changes', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      const changesLog = log.info.mock.calls.find(
        (call: string[]) => typeof call[0] === 'string' && call[0].includes('Changes (2)')
      );
      expect(changesLog).toBeDefined();
    });

    it('logs individual change details', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      const allLogs = log.info.mock.calls.map((c: string[]) => c[0]);
      expect(allLogs.some((m: string) => m.includes('correctness: 0.85'))).toBe(true);
      expect(allLogs.some((m: string) => m.includes('relevance: 0.82'))).toBe(true);
    });

    it('logs "no changes" when calibration produces none', async () => {
      mockCalibrateThresholds.mockResolvedValue(createMockCalibrationResult({ changes: [] }));
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      const noChangesLog = log.info.mock.calls.find(
        (call: string[]) =>
          typeof call[0] === 'string' && call[0].includes('No threshold changes needed')
      );
      expect(noChangesLog).toBeDefined();
    });

    it('shows previous value in tighten mode changes', async () => {
      mockCalibrateThresholds.mockResolvedValue(
        createMockCalibrationResult({
          changes: [
            { evaluator: 'correctness', previous: 0.8, recommended: 0.85, reason: 'Tightened' },
          ],
        })
      );
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      const changeLog = log.info.mock.calls.find(
        (call: string[]) => typeof call[0] === 'string' && call[0].includes('was 0.8')
      );
      expect(changeLog).toBeDefined();
    });
  });

  describe('stability warning', () => {
    it('warns when distinct run count is below --min-runs', async () => {
      mockGetDistinctRunCount.mockResolvedValue(1);
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      const warningLog = log.warning.mock.calls.find(
        (call: string[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('Calibrating from 1 run(s)') &&
          call[0].includes('soft gates')
      );
      expect(warningLog).toBeDefined();
    });

    it('does not warn when distinct run count meets --min-runs', async () => {
      mockGetDistinctRunCount.mockResolvedValue(5);
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      const warningLog = log.warning.mock.calls.find(
        (call: string[]) => typeof call[0] === 'string' && call[0].includes('soft gates')
      );
      expect(warningLog).toBeUndefined();
    });

    it('respects custom --min-runs value', async () => {
      mockGetDistinctRunCount.mockResolvedValue(4);
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc', 'min-runs': '5' });

      await calibrateCmd.run({ log, flagsReader } as any);

      const warningLog = log.warning.mock.calls.find(
        (call: string[]) =>
          typeof call[0] === 'string' &&
          call[0].includes('Calibrating from 4 run(s)') &&
          call[0].includes('>= 5 runs')
      );
      expect(warningLog).toBeDefined();
    });

    it('still runs calibration even when warning is emitted', async () => {
      mockGetDistinctRunCount.mockResolvedValue(1);
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      expect(mockCalibrateThresholds).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('closes ES client even on success', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await calibrateCmd.run({ log, flagsReader } as any);

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('closes ES client even when calibration throws', async () => {
      mockCalibrateThresholds.mockRejectedValue(new Error('calibration failed'));
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'run-id': 'abc' });

      await expect(calibrateCmd.run({ log, flagsReader } as any)).rejects.toThrow(
        'calibration failed'
      );
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });
});
