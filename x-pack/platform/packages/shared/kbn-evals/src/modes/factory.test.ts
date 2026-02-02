/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  createModeFromCliArgs,
  parseModeCliArgs,
  validateModeCliArgs,
  isContinuousModeController,
  isScheduledModeController,
  getCronPreset,
  getModeCliHelp,
  CronPresets,
  type ModeCliArgs,
  type ModeFactoryConfig,
} from './factory';
import type { ContinuousModeController } from './continuous';
import type { ScheduledModeController } from './scheduled';

// Mock chokidar for continuous mode
const mockWatcher = {
  on: jest.fn().mockReturnThis(),
  add: jest.fn(),
  unwatch: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  getWatched: jest.fn().mockReturnValue({}),
};

jest.mock('chokidar', () => ({
  watch: jest.fn(() => mockWatcher),
}));

// Mock node-cron for scheduled mode
const mockTask = {
  stop: jest.fn(),
};

jest.mock(
  'node-cron',
  () => ({
    schedule: jest.fn((_expression: string, callback: () => void, _options: unknown) => {
      (mockTask as any).callback = callback;
      return mockTask;
    }),
  }),
  { virtual: true }
);

const createMockLog = (): jest.Mocked<SomeDevLog> => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  write: jest.fn(),
  verbose: jest.fn(),
  success: jest.fn(),
});

describe('parseModeCliArgs', () => {
  it('should parse --mode argument', () => {
    const result = parseModeCliArgs(['--mode', 'scheduled']);
    expect(result.mode).toBe('scheduled');
  });

  it('should parse --mode=value format', () => {
    const result = parseModeCliArgs(['--mode=continuous']);
    expect(result.mode).toBe('continuous');
  });

  it('should parse --cron argument', () => {
    const result = parseModeCliArgs(['--cron', '0 * * * *']);
    expect(result.cron).toBe('0 * * * *');
  });

  it('should parse --cron=value format', () => {
    const result = parseModeCliArgs(['--cron=*/5 * * * *']);
    expect(result.cron).toBe('*/5 * * * *');
  });

  it('should parse --timezone argument', () => {
    const result = parseModeCliArgs(['--timezone', 'America/New_York']);
    expect(result.timezone).toBe('America/New_York');
  });

  it('should parse --timezone=value format', () => {
    const result = parseModeCliArgs(['--timezone=Europe/London']);
    expect(result.timezone).toBe('Europe/London');
  });

  it('should parse multiple --watch-path arguments', () => {
    const result = parseModeCliArgs([
      '--watch-path',
      './src/**/*.ts',
      '--watch-path',
      './test/**/*.ts',
    ]);
    expect(result.watchPaths).toEqual(['./src/**/*.ts', './test/**/*.ts']);
  });

  it('should parse --watch-path=value format', () => {
    const result = parseModeCliArgs(['--watch-path=./src/**/*.ts']);
    expect(result.watchPaths).toEqual(['./src/**/*.ts']);
  });

  it('should parse --debounce-ms argument', () => {
    const result = parseModeCliArgs(['--debounce-ms', '500']);
    expect(result.debounceMs).toBe(500);
  });

  it('should parse --debounce-ms=value format', () => {
    const result = parseModeCliArgs(['--debounce-ms=1000']);
    expect(result.debounceMs).toBe(1000);
  });

  it('should parse multiple --ignore-pattern arguments', () => {
    const result = parseModeCliArgs([
      '--ignore-pattern',
      '**/node_modules/**',
      '--ignore-pattern',
      '**/dist/**',
    ]);
    expect(result.ignorePatterns).toEqual(['**/node_modules/**', '**/dist/**']);
  });

  it('should parse --ignore-pattern=value format', () => {
    const result = parseModeCliArgs(['--ignore-pattern=**/build/**']);
    expect(result.ignorePatterns).toEqual(['**/build/**']);
  });

  it('should parse --trigger-directory argument', () => {
    const result = parseModeCliArgs(['--trigger-directory', '/path/to/project']);
    expect(result.triggerDirectory).toBe('/path/to/project');
  });

  it('should parse --trigger-directory=value format', () => {
    const result = parseModeCliArgs(['--trigger-directory=/custom/dir']);
    expect(result.triggerDirectory).toBe('/custom/dir');
  });

  it('should parse --trigger-file-name argument', () => {
    const result = parseModeCliArgs(['--trigger-file-name', '.custom-trigger']);
    expect(result.triggerFileName).toBe('.custom-trigger');
  });

  it('should parse --trigger-file-name=value format', () => {
    const result = parseModeCliArgs(['--trigger-file-name=.my-trigger']);
    expect(result.triggerFileName).toBe('.my-trigger');
  });

  it('should parse --run-on-start flag', () => {
    const result = parseModeCliArgs(['--run-on-start']);
    expect(result.runOnStart).toBe(true);
  });

  it('should parse combined arguments', () => {
    const result = parseModeCliArgs([
      '--mode',
      'scheduled',
      '--cron',
      '0 * * * *',
      '--timezone',
      'UTC',
      '--run-on-start',
    ]);
    expect(result).toEqual({
      mode: 'scheduled',
      cron: '0 * * * *',
      timezone: 'UTC',
      runOnStart: true,
    });
  });

  it('should return empty object for no mode arguments', () => {
    const result = parseModeCliArgs(['--other', 'value']);
    expect(result).toEqual({});
  });
});

describe('validateModeCliArgs', () => {
  it('should validate scheduled mode with cron expression', () => {
    const args: ModeCliArgs = {
      mode: 'scheduled',
      cron: '0 * * * *',
    };
    const result = validateModeCliArgs(args);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should reject scheduled mode without cron expression', () => {
    const args: ModeCliArgs = {
      mode: 'scheduled',
    };
    const result = validateModeCliArgs(args);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Scheduled mode requires a --cron expression');
  });

  it('should reject scheduled mode with invalid cron expression', () => {
    const args: ModeCliArgs = {
      mode: 'scheduled',
      cron: 'invalid',
    };
    const result = validateModeCliArgs(args);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid cron expression: invalid');
  });

  it('should validate continuous mode with watch paths', () => {
    const args: ModeCliArgs = {
      mode: 'continuous',
      watchPaths: ['./src/**/*.ts'],
    };
    const result = validateModeCliArgs(args);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should reject continuous mode without watch paths', () => {
    const args: ModeCliArgs = {
      mode: 'continuous',
    };
    const result = validateModeCliArgs(args);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Continuous mode requires at least one --watch-path');
  });

  it('should reject continuous mode with empty watch paths', () => {
    const args: ModeCliArgs = {
      mode: 'continuous',
      watchPaths: [],
    };
    const result = validateModeCliArgs(args);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Continuous mode requires at least one --watch-path');
  });

  it('should validate git-hook mode without additional requirements', () => {
    const args: ModeCliArgs = {
      mode: 'git-hook',
    };
    const result = validateModeCliArgs(args);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should validate once mode without additional requirements', () => {
    const args: ModeCliArgs = {
      mode: 'once',
    };
    const result = validateModeCliArgs(args);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should validate empty args (defaults to once mode)', () => {
    const args: ModeCliArgs = {};
    const result = validateModeCliArgs(args);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('createModeFromCliArgs', () => {
  let mockLog: jest.Mocked<SomeDevLog>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLog = createMockLog();
  });

  describe('once mode (SingleRunMode)', () => {
    it('should return null controller for once mode', () => {
      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: { mode: 'once' },
        onTrigger: jest.fn(),
      };

      const result = createModeFromCliArgs(config);

      expect(result.modeType).toBe('once');
      expect(result.controller).toBeNull();
      expect(result.hasController).toBe(false);
      expect(mockLog.debug).toHaveBeenCalledWith(
        expect.stringContaining('Running in "once" mode')
      );
    });

    it('should default to once mode when no mode specified', () => {
      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: {},
        onTrigger: jest.fn(),
      };

      const result = createModeFromCliArgs(config);

      expect(result.modeType).toBe('once');
      expect(result.controller).toBeNull();
      expect(result.hasController).toBe(false);
    });

    it('should not call any callbacks in once mode', () => {
      const onTrigger = jest.fn();
      const onError = jest.fn();
      const onReady = jest.fn();

      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: { mode: 'once' },
        onTrigger,
        onError,
        onReady,
      };

      createModeFromCliArgs(config);

      expect(onTrigger).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(onReady).not.toHaveBeenCalled();
    });
  });

  describe('continuous mode', () => {
    it('should create continuous mode controller', () => {
      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: {
          mode: 'continuous',
          watchPaths: ['./src/**/*.ts'],
        },
        onTrigger: jest.fn(),
      };

      const result = createModeFromCliArgs(config);

      expect(result.modeType).toBe('continuous');
      expect(result.controller).not.toBeNull();
      expect(result.hasController).toBe(true);
      expect(isContinuousModeController(result.controller)).toBe(true);
    });

    it('should pass configuration to continuous mode', () => {
      const onTrigger = jest.fn();
      const onError = jest.fn();
      const onReady = jest.fn();

      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: {
          mode: 'continuous',
          watchPaths: ['./src/**/*.ts', './test/**/*.ts'],
          debounceMs: 500,
          ignorePatterns: ['**/dist/**'],
        },
        onTrigger,
        onError,
        onReady,
      };

      const result = createModeFromCliArgs(config);

      expect(result.controller).not.toBeNull();
      const controller = result.controller as ContinuousModeController;
      expect(controller.getStatus()).toBe('idle');
    });

    it('should throw error when watch paths are missing', () => {
      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: {
          mode: 'continuous',
        },
        onTrigger: jest.fn(),
      };

      expect(() => createModeFromCliArgs(config)).toThrow('Invalid mode configuration');
      expect(mockLog.error).toHaveBeenCalled();
    });
  });

  describe('scheduled mode', () => {
    it('should create scheduled mode controller', () => {
      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: {
          mode: 'scheduled',
          cron: '0 * * * *',
        },
        onTrigger: jest.fn(),
      };

      const result = createModeFromCliArgs(config);

      expect(result.modeType).toBe('scheduled');
      expect(result.controller).not.toBeNull();
      expect(result.hasController).toBe(true);
      expect(isScheduledModeController(result.controller)).toBe(true);
    });

    it('should pass configuration to scheduled mode', () => {
      const onTrigger = jest.fn();
      const onError = jest.fn();
      const onReady = jest.fn();

      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: {
          mode: 'scheduled',
          cron: '*/5 * * * *',
          timezone: 'America/New_York',
          runOnStart: true,
        },
        onTrigger,
        onError,
        onReady,
        taskName: 'test-task',
      };

      const result = createModeFromCliArgs(config);

      expect(result.controller).not.toBeNull();
      const controller = result.controller as ScheduledModeController;
      expect(controller.getStatus()).toBe('idle');
      expect(controller.getStats().cronExpression).toBe('*/5 * * * *');
    });

    it('should throw error when cron expression is missing', () => {
      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: {
          mode: 'scheduled',
        },
        onTrigger: jest.fn(),
      };

      expect(() => createModeFromCliArgs(config)).toThrow('Invalid mode configuration');
      expect(mockLog.error).toHaveBeenCalled();
    });

    it('should throw error for invalid cron expression', () => {
      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: {
          mode: 'scheduled',
          cron: 'not-a-cron',
        },
        onTrigger: jest.fn(),
      };

      expect(() => createModeFromCliArgs(config)).toThrow('Invalid mode configuration');
    });
  });

  describe('git-hook mode', () => {
    it('should create git-hook mode controller', () => {
      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: {
          mode: 'git-hook',
        },
        onTrigger: jest.fn(),
      };

      const result = createModeFromCliArgs(config);

      expect(result.modeType).toBe('git-hook');
      expect(result.controller).not.toBeNull();
      expect(result.hasController).toBe(true);
      // git-hook mode creates a ContinuousModeController internally
      expect(isContinuousModeController(result.controller)).toBe(true);
    });

    it('should pass custom trigger configuration', () => {
      const config: ModeFactoryConfig = {
        log: mockLog,
        cliArgs: {
          mode: 'git-hook',
          triggerDirectory: '/custom/project',
          triggerFileName: '.my-custom-trigger',
        },
        onTrigger: jest.fn(),
      };

      const result = createModeFromCliArgs(config);

      expect(result.controller).not.toBeNull();
      expect(result.controller!.getStatus()).toBe('idle');
    });
  });
});

describe('isContinuousModeController', () => {
  let mockLog: jest.Mocked<SomeDevLog>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLog = createMockLog();
  });

  it('should return true for continuous mode controller', () => {
    const result = createModeFromCliArgs({
      log: mockLog,
      cliArgs: { mode: 'continuous', watchPaths: ['./src/**/*.ts'] },
      onTrigger: jest.fn(),
    });

    expect(isContinuousModeController(result.controller)).toBe(true);
  });

  it('should return true for git-hook mode controller', () => {
    const result = createModeFromCliArgs({
      log: mockLog,
      cliArgs: { mode: 'git-hook' },
      onTrigger: jest.fn(),
    });

    expect(isContinuousModeController(result.controller)).toBe(true);
  });

  it('should return false for scheduled mode controller', () => {
    const result = createModeFromCliArgs({
      log: mockLog,
      cliArgs: { mode: 'scheduled', cron: '0 * * * *' },
      onTrigger: jest.fn(),
    });

    expect(isContinuousModeController(result.controller)).toBe(false);
  });

  it('should return false for null controller', () => {
    expect(isContinuousModeController(null)).toBe(false);
  });
});

describe('isScheduledModeController', () => {
  let mockLog: jest.Mocked<SomeDevLog>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLog = createMockLog();
  });

  it('should return true for scheduled mode controller', () => {
    const result = createModeFromCliArgs({
      log: mockLog,
      cliArgs: { mode: 'scheduled', cron: '0 * * * *' },
      onTrigger: jest.fn(),
    });

    expect(isScheduledModeController(result.controller)).toBe(true);
  });

  it('should return false for continuous mode controller', () => {
    const result = createModeFromCliArgs({
      log: mockLog,
      cliArgs: { mode: 'continuous', watchPaths: ['./src/**/*.ts'] },
      onTrigger: jest.fn(),
    });

    expect(isScheduledModeController(result.controller)).toBe(false);
  });

  it('should return false for null controller', () => {
    expect(isScheduledModeController(null)).toBe(false);
  });
});

describe('getCronPreset', () => {
  it('should return preset for EVERY_MINUTE', () => {
    expect(getCronPreset('EVERY_MINUTE')).toBe('* * * * *');
  });

  it('should return preset for EVERY_HOUR', () => {
    expect(getCronPreset('EVERY_HOUR')).toBe('0 * * * *');
  });

  it('should return preset for DAILY_MIDNIGHT', () => {
    expect(getCronPreset('DAILY_MIDNIGHT')).toBe('0 0 * * *');
  });

  it('should return preset for WEEKLY_MONDAY', () => {
    expect(getCronPreset('WEEKLY_MONDAY')).toBe('0 0 * * 1');
  });

  it('should return preset for MONTHLY_FIRST', () => {
    expect(getCronPreset('MONTHLY_FIRST')).toBe('0 0 1 * *');
  });

  it('should return all preset values correctly', () => {
    expect(getCronPreset('EVERY_5_MINUTES')).toBe(CronPresets.EVERY_5_MINUTES);
    expect(getCronPreset('EVERY_15_MINUTES')).toBe(CronPresets.EVERY_15_MINUTES);
    expect(getCronPreset('EVERY_30_MINUTES')).toBe(CronPresets.EVERY_30_MINUTES);
    expect(getCronPreset('EVERY_6_HOURS')).toBe(CronPresets.EVERY_6_HOURS);
    expect(getCronPreset('EVERY_12_HOURS')).toBe(CronPresets.EVERY_12_HOURS);
    expect(getCronPreset('DAILY_6AM')).toBe(CronPresets.DAILY_6AM);
    expect(getCronPreset('DAILY_NOON')).toBe(CronPresets.DAILY_NOON);
    expect(getCronPreset('WEEKLY_SUNDAY')).toBe(CronPresets.WEEKLY_SUNDAY);
  });
});

describe('getModeCliHelp', () => {
  it('should return help text as a string', () => {
    const help = getModeCliHelp();
    expect(typeof help).toBe('string');
  });

  it('should include all mode options', () => {
    const help = getModeCliHelp();
    expect(help).toContain('--mode');
    expect(help).toContain('continuous');
    expect(help).toContain('scheduled');
    expect(help).toContain('git-hook');
    expect(help).toContain('once');
  });

  it('should include scheduled mode options', () => {
    const help = getModeCliHelp();
    expect(help).toContain('--cron');
    expect(help).toContain('--timezone');
    expect(help).toContain('--run-on-start');
  });

  it('should include continuous mode options', () => {
    const help = getModeCliHelp();
    expect(help).toContain('--watch-path');
    expect(help).toContain('--debounce-ms');
    expect(help).toContain('--ignore-pattern');
  });

  it('should include git hook mode options', () => {
    const help = getModeCliHelp();
    expect(help).toContain('--trigger-directory');
    expect(help).toContain('--trigger-file-name');
  });

  it('should include cron presets documentation', () => {
    const help = getModeCliHelp();
    expect(help).toContain('EVERY_MINUTE');
    expect(help).toContain('EVERY_HOUR');
    expect(help).toContain('DAILY_MIDNIGHT');
    expect(help).toContain('WEEKLY_MONDAY');
    expect(help).toContain('MONTHLY_FIRST');
  });
});

describe('CronPresets export', () => {
  it('should export CronPresets', () => {
    expect(CronPresets).toBeDefined();
    expect(CronPresets.EVERY_MINUTE).toBe('* * * * *');
  });
});
