/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../coverage/analyzer', () => ({
  analyzeCoverage: jest.fn(),
}));

jest.mock('../suites', () => ({
  resolveEvalSuites: jest.fn(() => [
    {
      id: 'suite-a',
      name: 'Suite A',
      configPath: 'x-pack/test/suite_a/playwright.config.ts',
      absoluteConfigPath: '/repo/x-pack/test/suite_a/playwright.config.ts',
      suiteRoot: 'x-pack/test/suite_a',
      relativeSuiteRoot: 'x-pack/test/suite_a',
      tags: ['search', 'correctness'],
      ciLabels: ['evals:suite-a'],
      source: 'metadata' as const,
    },
  ]),
}));

jest.mock('../../quality_gates/types', () => ({
  parseGateConfig: jest.fn((raw: string) => JSON.parse(raw)),
}));

import Fs from 'fs';
import Path from 'path';
import { coverageCmd } from './coverage';
import { analyzeCoverage } from '../../coverage/analyzer';
import type { CoverageReport } from '../../coverage/analyzer';

const mockAnalyzeCoverage = analyzeCoverage as jest.MockedFunction<typeof analyzeCoverage>;

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

const createMockReport = (overrides: Partial<CoverageReport> = {}): CoverageReport => ({
  toolCoverage: [
    { toolId: 'search', coveredBy: ['suite-a'], percentage: 1 },
    { toolId: 'filter', coveredBy: [], percentage: 0 },
  ],
  evaluatorCoverage: [
    { evaluatorName: 'correctness', usedIn: ['suite-a'] },
    { evaluatorName: 'relevance', usedIn: [] },
  ],
  overallToolCoveragePercent: 50.0,
  overallEvaluatorCoveragePercent: 50.0,
  gaps: ['Tool "filter" has no covering eval suite', 'Evaluator "relevance" is not used in any suite'],
  ...overrides,
});

describe('coverageCmd', () => {
  const tmpDir = Path.join(__dirname, '__tmp_coverage_test__');
  const gateConfigFile = Path.join(tmpDir, 'gates.json');
  const originalStdoutWrite = process.stdout.write;

  beforeAll(() => {
    Fs.mkdirSync(tmpDir, { recursive: true });
    Fs.writeFileSync(
      gateConfigFile,
      JSON.stringify({
        score: { avg: 0.8 },
        evaluators: { correctness: { min: 0.7, avg: 0.85 } },
      })
    );
  });

  afterAll(() => {
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.stdout.write = jest.fn() as any;
    process.exitCode = undefined;
    mockAnalyzeCoverage.mockReturnValue(createMockReport());
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    process.exitCode = undefined;
  });

  describe('metadata', () => {
    it('has the correct command name', () => {
      expect(coverageCmd.name).toBe('coverage');
    });

    it('defines string flags', () => {
      expect(coverageCmd.flags?.string).toEqual(
        expect.arrayContaining(['tools', 'evaluators', 'gate-config'])
      );
    });

    it('defines boolean flag for json', () => {
      expect(coverageCmd.flags?.boolean).toContain('json');
    });

    it('defaults json to false', () => {
      expect(coverageCmd.flags?.default).toEqual(expect.objectContaining({ json: false }));
    });
  });

  describe('tool and evaluator parsing', () => {
    it('parses comma-separated --tools', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ tools: 'search, filter, display' });

      await coverageCmd.run({ log, flagsReader } as any);

      expect(mockAnalyzeCoverage).toHaveBeenCalledWith(
        expect.objectContaining({
          toolIds: ['search', 'filter', 'display'],
        })
      );
    });

    it('parses comma-separated --evaluators', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ evaluators: 'correctness,relevance' });

      await coverageCmd.run({ log, flagsReader } as any);

      expect(mockAnalyzeCoverage).toHaveBeenCalledWith(
        expect.objectContaining({
          evaluatorNames: ['correctness', 'relevance'],
        })
      );
    });

    it('passes empty arrays when tools and evaluators are omitted', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      await coverageCmd.run({ log, flagsReader } as any);

      expect(mockAnalyzeCoverage).toHaveBeenCalledWith(
        expect.objectContaining({
          toolIds: [],
          evaluatorNames: [],
        })
      );
    });
  });

  describe('gate config', () => {
    it('loads gate config from file path', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ 'gate-config': gateConfigFile });

      await coverageCmd.run({ log, flagsReader } as any);

      expect(mockAnalyzeCoverage).toHaveBeenCalledWith(
        expect.objectContaining({
          gateConfig: expect.objectContaining({
            score: { avg: 0.8 },
          }),
        })
      );
    });

    it('sets exitCode when gate config file is missing', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({
        'gate-config': '/nonexistent/gates.json',
      });

      await coverageCmd.run({ log, flagsReader } as any);

      expect(process.exitCode).toBe(1);
      expect(log.error).toHaveBeenCalled();
      expect(mockAnalyzeCoverage).not.toHaveBeenCalled();
    });

    it('omits gate config when flag is absent', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      await coverageCmd.run({ log, flagsReader } as any);

      expect(mockAnalyzeCoverage).toHaveBeenCalledWith(
        expect.objectContaining({
          gateConfig: undefined,
        })
      );
    });
  });

  describe('text output (default)', () => {
    it('logs suite count', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      await coverageCmd.run({ log, flagsReader } as any);

      const suiteLog = log.info.mock.calls.find(
        (call: string[]) => typeof call[0] === 'string' && call[0].includes('Found')
      );
      expect(suiteLog).toBeDefined();
      expect(suiteLog![0]).toContain('eval suite');
    });

    it('logs tool coverage percentage', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      await coverageCmd.run({ log, flagsReader } as any);

      const coverageLog = log.info.mock.calls.find(
        (call: string[]) =>
          typeof call[0] === 'string' && call[0].includes('Tool coverage: 50.0%')
      );
      expect(coverageLog).toBeDefined();
    });

    it('logs evaluator coverage percentage', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      await coverageCmd.run({ log, flagsReader } as any);

      const coverageLog = log.info.mock.calls.find(
        (call: string[]) =>
          typeof call[0] === 'string' && call[0].includes('Evaluator coverage: 50.0%')
      );
      expect(coverageLog).toBeDefined();
    });

    it('logs covered and missing tools', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      await coverageCmd.run({ log, flagsReader } as any);

      const allLogs = log.info.mock.calls.map((c: string[]) => c[0]);
      expect(allLogs.some((m: string) => m.includes('search: covered'))).toBe(true);
      expect(allLogs.some((m: string) => m.includes('filter: MISSING'))).toBe(true);
    });

    it('logs used and unused evaluators', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      await coverageCmd.run({ log, flagsReader } as any);

      const allLogs = log.info.mock.calls.map((c: string[]) => c[0]);
      expect(allLogs.some((m: string) => m.includes('correctness: used'))).toBe(true);
      expect(allLogs.some((m: string) => m.includes('relevance: UNUSED'))).toBe(true);
    });

    it('logs gaps as warnings', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      await coverageCmd.run({ log, flagsReader } as any);

      expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('Gaps (2)'));
    });

    it('logs gate readiness when present', async () => {
      mockAnalyzeCoverage.mockReturnValue(
        createMockReport({
          gateReadiness: [
            { evaluator: 'correctness', meetsThreshold: true, actual: 0.9, required: 0.85 },
            { evaluator: 'relevance', meetsThreshold: false, actual: 0.6, required: 0.8 },
          ],
        })
      );
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({});

      await coverageCmd.run({ log, flagsReader } as any);

      const allLogs = log.info.mock.calls.map((c: string[]) => c[0]);
      expect(allLogs.some((m: string) => m.includes('correctness: PASS'))).toBe(true);
      expect(allLogs.some((m: string) => m.includes('relevance: FAIL'))).toBe(true);
    });
  });

  describe('--json output', () => {
    it('writes JSON to stdout', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ json: true });

      await coverageCmd.run({ log, flagsReader } as any);

      expect(process.stdout.write).toHaveBeenCalledTimes(1);
      const output = (process.stdout.write as jest.Mock).mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('toolCoverage');
      expect(parsed).toHaveProperty('evaluatorCoverage');
      expect(parsed).toHaveProperty('gaps');
    });

    it('does not log text output in json mode', async () => {
      const log = createMockLog();
      const flagsReader = createMockFlagsReader({ json: true });

      await coverageCmd.run({ log, flagsReader } as any);

      const toolCoverageLog = log.info.mock.calls.find(
        (call: string[]) => typeof call[0] === 'string' && call[0].includes('Tool coverage:')
      );
      expect(toolCoverageLog).toBeUndefined();
    });
  });
});
