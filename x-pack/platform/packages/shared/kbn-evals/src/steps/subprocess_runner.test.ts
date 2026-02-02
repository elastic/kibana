/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEvalSuiteSubprocessRunner, runEvalSuiteSubprocess } from './subprocess_runner';

// Mock child_process
const mockSpawn = jest.fn();
jest.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Mock p-limit
jest.mock('p-limit', () => ({
  default: (concurrency: number) => {
    return <T>(fn: () => Promise<T>) => fn();
  },
}));

describe('subprocess_runner', () => {
  const mockLog = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    write: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('runEvalSuiteSubprocess', () => {
    it('should spawn playwright with correct arguments', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'close') {
            setImmediate(() => callback(0));
          }
        }),
        killed: false,
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const resultPromise = runEvalSuiteSubprocess({
        configPath: 'path/to/playwright.config.ts',
        log: mockLog as any,
      });

      jest.runAllTimers();
      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        process.execPath,
        ['scripts/playwright.js', 'test', '--config=path/to/playwright.config.ts'],
        expect.objectContaining({
          env: expect.any(Object),
          stdio: 'pipe',
        })
      );

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    });

    it('should add project filter when specified', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'close') {
            setImmediate(() => callback(0));
          }
        }),
        killed: false,
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const resultPromise = runEvalSuiteSubprocess({
        configPath: 'path/to/playwright.config.ts',
        project: 'azure-gpt4o',
        log: mockLog as any,
      });

      jest.runAllTimers();
      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--project=azure-gpt4o']),
        expect.any(Object)
      );
    });

    it('should add workers flag when specified', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'close') {
            setImmediate(() => callback(0));
          }
        }),
        killed: false,
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const resultPromise = runEvalSuiteSubprocess({
        configPath: 'path/to/playwright.config.ts',
        workers: 4,
        log: mockLog as any,
      });

      jest.runAllTimers();
      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--workers=4']),
        expect.any(Object)
      );
    });

    it('should add grep patterns when specified', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'close') {
            setImmediate(() => callback(0));
          }
        }),
        killed: false,
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const resultPromise = runEvalSuiteSubprocess({
        configPath: 'path/to/playwright.config.ts',
        grep: 'my-test',
        grepInvert: 'slow-test',
        log: mockLog as any,
      });

      jest.runAllTimers();
      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--grep=my-test', '--grep-invert=slow-test']),
        expect.any(Object)
      );
    });

    it('should pass custom environment variables', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'close') {
            setImmediate(() => callback(0));
          }
        }),
        killed: false,
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const resultPromise = runEvalSuiteSubprocess({
        configPath: 'path/to/playwright.config.ts',
        env: {
          EVALUATION_CONNECTOR_ID: 'my-connector',
          EVALUATION_REPETITIONS: '3',
        },
        log: mockLog as any,
      });

      jest.runAllTimers();
      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            EVALUATION_CONNECTOR_ID: 'my-connector',
            EVALUATION_REPETITIONS: '3',
          }),
        })
      );
    });

    it('should handle non-zero exit codes', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'close') {
            setImmediate(() => callback(1));
          }
        }),
        killed: false,
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const resultPromise = runEvalSuiteSubprocess({
        configPath: 'path/to/playwright.config.ts',
        log: mockLog as any,
      });

      jest.runAllTimers();
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should handle spawn errors', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: (error?: Error) => void) => {
          if (event === 'error') {
            setImmediate(() => callback(new Error('spawn failed')));
          }
        }),
        killed: false,
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const resultPromise = runEvalSuiteSubprocess({
        configPath: 'path/to/playwright.config.ts',
        log: mockLog as any,
      });

      jest.runAllTimers();
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('spawn failed');
    });

    it('should include test files when specified', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'close') {
            setImmediate(() => callback(0));
          }
        }),
        killed: false,
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const resultPromise = runEvalSuiteSubprocess({
        configPath: 'path/to/playwright.config.ts',
        testFiles: ['test1.spec.ts', 'test2.spec.ts'],
        log: mockLog as any,
      });

      jest.runAllTimers();
      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['test1.spec.ts', 'test2.spec.ts']),
        expect.any(Object)
      );
    });

    it('should add --headed flag when headed is true', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'close') {
            setImmediate(() => callback(0));
          }
        }),
        killed: false,
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const resultPromise = runEvalSuiteSubprocess({
        configPath: 'path/to/playwright.config.ts',
        headed: true,
        log: mockLog as any,
      });

      jest.runAllTimers();
      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--headed']),
        expect.any(Object)
      );
    });
  });

  describe('createEvalSuiteSubprocessRunner', () => {
    it('should create a runner with preset defaults', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'close') {
            setImmediate(() => callback(0));
          }
        }),
        killed: false,
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const runner = createEvalSuiteSubprocessRunner({
        log: mockLog as any,
        cwd: '/custom/cwd',
        defaultEnv: {
          DEFAULT_VAR: 'default-value',
        },
      });

      const resultPromise = runner.run({
        configPath: 'path/to/playwright.config.ts',
        env: {
          CUSTOM_VAR: 'custom-value',
        },
      });

      jest.runAllTimers();
      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          cwd: '/custom/cwd',
          env: expect.objectContaining({
            DEFAULT_VAR: 'default-value',
            CUSTOM_VAR: 'custom-value',
          }),
        })
      );
    });

    it('should allow custom env to override default env', async () => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event: string, callback: (code: number | null) => void) => {
          if (event === 'close') {
            setImmediate(() => callback(0));
          }
        }),
        killed: false,
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockProcess);

      const runner = createEvalSuiteSubprocessRunner({
        log: mockLog as any,
        defaultEnv: {
          SHARED_VAR: 'default-value',
        },
      });

      const resultPromise = runner.run({
        configPath: 'path/to/playwright.config.ts',
        env: {
          SHARED_VAR: 'overridden-value',
        },
      });

      jest.runAllTimers();
      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            SHARED_VAR: 'overridden-value',
          }),
        })
      );
    });
  });
});
