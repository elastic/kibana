/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { FlagsReader } from '@kbn/dev-cli-runner/src/flags/flags_reader';
import { EXIT_CODES, GLOBAL_FLAGS } from '../types';
import { Formatter } from '../output/formatter';
import type { HttpClient, HttpError } from '../http_client';

// Import commands to test
import { listCommand } from './list';
import { getCommand } from './get';
import { deleteCommand } from './delete';
import { forkCommand } from './fork';
import { statusCommand } from './status';
import { enableCommand } from './enable';
import { disableCommand } from './disable';
import { resyncCommand } from './resync';
import { upsertCommand } from './upsert';
import { ingestGetCommand, ingestSetCommand } from './ingest';
import {
  featuresListCommand,
  featuresUpsertCommand,
  featuresDeleteCommand,
  featuresBulkCommand,
  featuresIdentifyCommand,
} from './features';
import {
  significantEventsReadCommand,
  significantEventsPreviewCommand,
  significantEventsTaskCommand,
} from './significant_events';

describe('EXIT_CODES', () => {
  it('defines expected exit codes', () => {
    expect(EXIT_CODES.SUCCESS).toBe(0);
    expect(EXIT_CODES.GENERAL_ERROR).toBe(1);
    expect(EXIT_CODES.FLAG_ERROR).toBe(2);
    expect(EXIT_CODES.USER_CANCELLED).toBe(3);
  });
});

describe('GLOBAL_FLAGS', () => {
  it('defines string flags', () => {
    expect(GLOBAL_FLAGS.string).toContain('es-url');
    expect(GLOBAL_FLAGS.string).toContain('kibana-url');
    expect(GLOBAL_FLAGS.string).toContain('username');
    expect(GLOBAL_FLAGS.string).toContain('password');
  });

  it('defines boolean flags', () => {
    expect(GLOBAL_FLAGS.boolean).toContain('json');
    expect(GLOBAL_FLAGS.boolean).toContain('yes');
  });

  it('has correct defaults', () => {
    expect(GLOBAL_FLAGS.default).toEqual({
      username: 'elastic',
      password: 'changeme',
      json: false,
      yes: false,
    });
  });
});

describe('Command definitions', () => {
  describe('Core stream commands', () => {
    it('listCommand has correct structure', () => {
      expect(listCommand.name).toBe('list');
      expect(listCommand.description).toBeDefined();
      expect(typeof listCommand.run).toBe('function');
    });

    it('getCommand has correct structure', () => {
      expect(getCommand.name).toBe('get');
      expect(getCommand.description).toBeDefined();
      expect(typeof getCommand.run).toBe('function');
    });

    it('upsertCommand has correct structure', () => {
      expect(upsertCommand.name).toBe('upsert');
      expect(upsertCommand.description).toBeDefined();
      expect(upsertCommand.flags?.string).toContain('file');
      expect(upsertCommand.flags?.boolean).toContain('stdin');
    });

    it('deleteCommand has correct structure', () => {
      expect(deleteCommand.name).toBe('delete');
      expect(deleteCommand.description).toBeDefined();
      expect(typeof deleteCommand.run).toBe('function');
    });

    it('forkCommand has correct structure', () => {
      expect(forkCommand.name).toBe('fork');
      expect(forkCommand.description).toBeDefined();
      expect(forkCommand.flags?.string).toContain('child');
      expect(forkCommand.flags?.string).toContain('condition');
    });

    it('statusCommand has correct structure', () => {
      expect(statusCommand.name).toBe('status');
      expect(statusCommand.description).toBeDefined();
    });

    it('enableCommand has correct structure', () => {
      expect(enableCommand.name).toBe('enable');
      expect(enableCommand.description).toBeDefined();
    });

    it('disableCommand has correct structure', () => {
      expect(disableCommand.name).toBe('disable');
      expect(disableCommand.description).toBeDefined();
    });

    it('resyncCommand has correct structure', () => {
      expect(resyncCommand.name).toBe('resync');
      expect(resyncCommand.description).toBeDefined();
    });
  });

  describe('Ingest commands', () => {
    it('ingestGetCommand has correct structure', () => {
      expect(ingestGetCommand.name).toBe('ingest-get');
      expect(ingestGetCommand.description).toBeDefined();
    });

    it('ingestSetCommand has correct structure', () => {
      expect(ingestSetCommand.name).toBe('ingest-set');
      expect(ingestSetCommand.description).toBeDefined();
      expect(ingestSetCommand.flags?.string).toContain('file');
      expect(ingestSetCommand.flags?.boolean).toContain('stdin');
    });
  });

  describe('Features commands', () => {
    it('featuresListCommand has correct structure', () => {
      expect(featuresListCommand.name).toBe('features-list');
      expect(featuresListCommand.description).toBeDefined();
    });

    it('featuresUpsertCommand has correct structure', () => {
      expect(featuresUpsertCommand.name).toBe('features-upsert');
      expect(featuresUpsertCommand.description).toBeDefined();
      expect(featuresUpsertCommand.flags?.string).toContain('file');
    });

    it('featuresDeleteCommand has correct structure', () => {
      expect(featuresDeleteCommand.name).toBe('features-delete');
      expect(featuresDeleteCommand.description).toBeDefined();
      expect(featuresDeleteCommand.flags?.string).toContain('id');
    });

    it('featuresBulkCommand has correct structure', () => {
      expect(featuresBulkCommand.name).toBe('features-bulk');
      expect(featuresBulkCommand.description).toBeDefined();
    });

    it('featuresIdentifyCommand has correct structure', () => {
      expect(featuresIdentifyCommand.name).toBe('features-identify');
      expect(featuresIdentifyCommand.description).toBeDefined();
      expect(featuresIdentifyCommand.flags?.string).toContain('from');
      expect(featuresIdentifyCommand.flags?.string).toContain('to');
      expect(featuresIdentifyCommand.flags?.string).toContain('connector-id');
    });
  });

  describe('Significant events commands', () => {
    it('significantEventsReadCommand has correct structure', () => {
      expect(significantEventsReadCommand.name).toBe('significant-events-read');
      expect(significantEventsReadCommand.description).toBeDefined();
    });

    it('significantEventsPreviewCommand has correct structure', () => {
      expect(significantEventsPreviewCommand.name).toBe('significant-events-preview');
      expect(significantEventsPreviewCommand.description).toBeDefined();
    });

    it('significantEventsTaskCommand has correct structure', () => {
      expect(significantEventsTaskCommand.name).toBe('significant-events-task');
      expect(significantEventsTaskCommand.description).toBeDefined();
    });
  });
});

describe('Command execution', () => {
  let mockLog: jest.Mocked<ToolingLog>;
  let mockHttpClient: jest.Mocked<HttpClient>;
  let stdoutWriteSpy: jest.SpyInstance;
  let originalExitCode: number | undefined;

  beforeEach(() => {
    mockLog = {
      write: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ToolingLog>;

    mockHttpClient = {
      getPublic: jest.fn(),
      postPublic: jest.fn(),
      putPublic: jest.fn(),
      deletePublic: jest.fn(),
      getInternal: jest.fn(),
      postInternal: jest.fn(),
      deleteInternal: jest.fn(),
      request: jest.fn(),
    } as unknown as jest.Mocked<HttpClient>;

    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
    process.exitCode = originalExitCode;
  });

  function createContext(options: {
    flags?: Record<string, unknown>;
    positionalArgs?: string[];
    isJsonMode?: boolean;
  }) {
    const flags = {
      _: options.positionalArgs || [],
      json: options.isJsonMode || false,
      yes: false,
      ...options.flags,
    };

    return {
      httpClient: mockHttpClient,
      flagsReader: {
        string: jest.fn((name: string) => flags[name] as string | undefined),
        boolean: jest.fn((name: string) => !!flags[name]),
        arrayOfStrings: jest.fn(() => []),
        number: jest.fn(),
        enum: jest.fn(),
        path: jest.fn(),
      } as unknown as FlagsReader,
      log: mockLog,
      flags,
      addCleanupTask: jest.fn(),
      procRunner: {} as any,
    };
  }

  describe('list command', () => {
    it('fetches and displays streams', async () => {
      mockHttpClient.getPublic.mockResolvedValue({
        streams: [{ name: 'logs' }, { name: 'metrics' }],
      });

      const context = createContext({});
      await listCommand.run(context as any);

      expect(mockHttpClient.getPublic).toHaveBeenCalledWith('/api/streams');
      expect(mockLog.write).toHaveBeenCalledWith('Streams:');
      expect(process.exitCode).toBeUndefined();
    });

    it('outputs JSON in json mode', async () => {
      mockHttpClient.getPublic.mockResolvedValue({
        streams: [{ name: 'logs' }],
      });

      const context = createContext({ isJsonMode: true });
      await listCommand.run(context as any);

      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('"streams":[{"name":"logs"}]')
      );
    });

    it('sets exit code 1 on error', async () => {
      const error = new Error('Connection failed') as any;
      error.statusCode = 500;
      mockHttpClient.getPublic.mockRejectedValue(error);

      const context = createContext({});
      await listCommand.run(context as any);

      expect(process.exitCode).toBe(1);
      expect(mockLog.error).toHaveBeenCalledWith('Connection failed');
    });
  });

  describe('get command', () => {
    it('throws flag error when name is missing', async () => {
      const context = createContext({ positionalArgs: [] });

      await expect(getCommand.run(context as any)).rejects.toThrow();
    });

    it('fetches stream by name', async () => {
      mockHttpClient.getPublic.mockResolvedValue({
        name: 'logs',
        stream: { ingest: {} },
      });

      const context = createContext({ positionalArgs: ['logs'] });
      await getCommand.run(context as any);

      expect(mockHttpClient.getPublic).toHaveBeenCalledWith('/api/streams/logs');
    });

    it('URL-encodes stream name', async () => {
      mockHttpClient.getPublic.mockResolvedValue({ name: 'logs.nginx' });

      const context = createContext({ positionalArgs: ['logs.nginx'] });
      await getCommand.run(context as any);

      expect(mockHttpClient.getPublic).toHaveBeenCalledWith('/api/streams/logs.nginx');
    });
  });

  describe('status command', () => {
    it('fetches and displays streams status', async () => {
      mockHttpClient.getInternal.mockResolvedValue({
        enabled: true,
        can_manage: true,
      });

      const context = createContext({});
      await statusCommand.run(context as any);

      expect(mockHttpClient.getInternal).toHaveBeenCalledWith('/api/streams/_status');
    });
  });

  describe('enable command', () => {
    it('posts to enable endpoint', async () => {
      mockHttpClient.postPublic.mockResolvedValue({ acknowledged: true });

      const context = createContext({});
      await enableCommand.run(context as any);

      expect(mockHttpClient.postPublic).toHaveBeenCalledWith('/api/streams/_enable');
    });
  });

  describe('disable command', () => {
    it('posts to disable endpoint with --yes flag', async () => {
      mockHttpClient.postPublic.mockResolvedValue({ acknowledged: true });

      const context = createContext({ flags: { yes: true } });
      // Override isTTY to prevent confirmation prompt
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = false;

      await disableCommand.run(context as any);

      process.stdin.isTTY = originalIsTTY;
      expect(mockHttpClient.postPublic).toHaveBeenCalledWith('/api/streams/_disable');
    });
  });

  describe('resync command', () => {
    it('posts to resync endpoint', async () => {
      mockHttpClient.postPublic.mockResolvedValue({ acknowledged: true });

      const context = createContext({});
      await resyncCommand.run(context as any);

      expect(mockHttpClient.postPublic).toHaveBeenCalledWith('/api/streams/_resync');
    });
  });

  describe('fork command', () => {
    it('throws flag error when name is missing', async () => {
      const context = createContext({ positionalArgs: [] });

      await expect(forkCommand.run(context as any)).rejects.toThrow();
    });

    it('throws flag error when --child is missing', async () => {
      const context = createContext({ positionalArgs: ['logs'] });

      await expect(forkCommand.run(context as any)).rejects.toThrow('--child');
    });

    it('throws flag error when --condition is missing', async () => {
      const context = createContext({
        positionalArgs: ['logs'],
        flags: { child: 'logs.nginx' },
      });

      // Need to mock flagsReader to return the child value
      const ctx = context as any;
      ctx.flagsReader.string = jest.fn((name: string) => {
        if (name === 'child') return 'logs.nginx';
        return undefined;
      });

      await expect(forkCommand.run(ctx)).rejects.toThrow('--condition');
    });

    it('posts fork request with valid parameters', async () => {
      mockHttpClient.postPublic.mockResolvedValue({ acknowledged: true });

      const context = createContext({
        positionalArgs: ['logs'],
        flags: { child: 'logs.nginx', condition: '{"field":"agent","eq":"nginx"}' },
      }) as any;

      context.flagsReader.string = jest.fn((name: string) => {
        if (name === 'child') return 'logs.nginx';
        if (name === 'condition') return '{"field":"agent","eq":"nginx"}';
        return undefined;
      });

      await forkCommand.run(context);

      expect(mockHttpClient.postPublic).toHaveBeenCalledWith(
        '/api/streams/logs/_fork',
        expect.objectContaining({
          stream: { name: 'logs.nginx' },
          where: { field: 'agent', eq: 'nginx' },
        })
      );
    });
  });

  describe('features-list command', () => {
    it('throws flag error when stream name is missing', async () => {
      const context = createContext({ positionalArgs: [] });

      await expect(featuresListCommand.run(context as any)).rejects.toThrow();
    });

    it('fetches features for a stream', async () => {
      mockHttpClient.getInternal.mockResolvedValue({ features: [] });

      const context = createContext({ positionalArgs: ['logs'] });
      await featuresListCommand.run(context as any);

      expect(mockHttpClient.getInternal).toHaveBeenCalledWith(
        '/internal/streams/logs/features',
        {}
      );
    });

    it('passes type filter when provided', async () => {
      mockHttpClient.getInternal.mockResolvedValue({ features: [] });

      const context = createContext({
        positionalArgs: ['logs'],
        flags: { type: 'classification' },
      }) as any;

      context.flagsReader.string = jest.fn((name: string) => {
        if (name === 'type') return 'classification';
        return undefined;
      });

      await featuresListCommand.run(context);

      expect(mockHttpClient.getInternal).toHaveBeenCalledWith(
        '/internal/streams/logs/features',
        { type: 'classification' }
      );
    });
  });

  describe('features-identify command', () => {
    it('throws flag error when stream name is missing', async () => {
      const context = createContext({ positionalArgs: [] });

      await expect(featuresIdentifyCommand.run(context as any)).rejects.toThrow();
    });

    it('throws flag error when action is missing', async () => {
      const context = createContext({ positionalArgs: ['logs'] });

      await expect(featuresIdentifyCommand.run(context as any)).rejects.toThrow('Action is required');
    });

    it('throws flag error when action is invalid', async () => {
      const context = createContext({ positionalArgs: ['logs', 'invalid-action'] });

      await expect(featuresIdentifyCommand.run(context as any)).rejects.toThrow('Action is required');
    });

    it('fetches status for status action', async () => {
      mockHttpClient.getInternal.mockResolvedValue({ state: 'idle' });

      const context = createContext({ positionalArgs: ['logs', 'status'] });
      await featuresIdentifyCommand.run(context as any);

      expect(mockHttpClient.getInternal).toHaveBeenCalledWith(
        '/internal/streams/logs/features/_status'
      );
    });

    it('posts task for schedule action', async () => {
      mockHttpClient.postInternal.mockResolvedValue({ state: 'scheduled' });

      const context = createContext({
        positionalArgs: ['logs', 'schedule'],
        flags: { from: '2024-01-01', to: '2024-01-31' },
      }) as any;

      context.flagsReader.string = jest.fn((name: string) => {
        if (name === 'from') return '2024-01-01';
        if (name === 'to') return '2024-01-31';
        return undefined;
      });

      await featuresIdentifyCommand.run(context);

      expect(mockHttpClient.postInternal).toHaveBeenCalledWith(
        '/internal/streams/logs/features/_task',
        expect.objectContaining({
          action: 'schedule',
          from: '2024-01-01',
          to: '2024-01-31',
        })
      );
    });

    it('sets exit code 1 when schedule is missing from/to', async () => {
      // The --from and --to validation happens inside the try/catch block,
      // so it sets exitCode instead of throwing
      const context = createContext({ positionalArgs: ['logs', 'schedule'] }) as any;

      context.flagsReader.string = jest.fn((name: string) => undefined);

      await featuresIdentifyCommand.run(context);

      expect(process.exitCode).toBe(1);
      expect(mockLog.error).toHaveBeenCalledWith('--from and --to are required for schedule action');
    });
  });

  describe('significant-events-read command', () => {
    it('throws flag error when stream name is missing', async () => {
      const context = createContext({ positionalArgs: [] });

      await expect(significantEventsReadCommand.run(context as any)).rejects.toThrow();
    });

    it('throws flag error when required params are missing', async () => {
      const context = createContext({ positionalArgs: ['logs'] });

      await expect(significantEventsReadCommand.run(context as any)).rejects.toThrow('--from, --to, and --bucket-size are required');
    });

    it('fetches significant events with required params', async () => {
      mockHttpClient.getPublic.mockResolvedValue({ events: [] });

      const context = createContext({
        positionalArgs: ['logs'],
        flags: { from: '2024-01-01', to: '2024-01-31', 'bucket-size': '1h' },
      }) as any;

      context.flagsReader.string = jest.fn((name: string) => {
        const values: Record<string, string> = {
          from: '2024-01-01',
          to: '2024-01-31',
          'bucket-size': '1h',
        };
        return values[name];
      });

      await significantEventsReadCommand.run(context);

      expect(mockHttpClient.getPublic).toHaveBeenCalledWith(
        '/api/streams/logs/significant_events',
        expect.objectContaining({
          from: '2024-01-01',
          to: '2024-01-31',
          bucketSize: '1h',
        })
      );
    });
  });

  describe('significant-events-task command', () => {
    it('throws flag error when stream name is missing', async () => {
      const context = createContext({ positionalArgs: [] });

      await expect(significantEventsTaskCommand.run(context as any)).rejects.toThrow();
    });

    it('throws flag error when action is missing', async () => {
      const context = createContext({ positionalArgs: ['logs'] });

      await expect(significantEventsTaskCommand.run(context as any)).rejects.toThrow('Action is required');
    });

    it('fetches status for status action', async () => {
      mockHttpClient.getInternal.mockResolvedValue({ state: 'idle' });

      const context = createContext({ positionalArgs: ['logs', 'status'] });
      await significantEventsTaskCommand.run(context as any);

      expect(mockHttpClient.getInternal).toHaveBeenCalledWith(
        '/internal/streams/logs/significant_events/_status'
      );
    });
  });
});
