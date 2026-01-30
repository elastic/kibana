/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { FlagsReader } from '@kbn/dev-cli-runner/src/flags/flags_reader';
import { HttpClient, HttpError } from './http_client';
import { Formatter } from './output/formatter';
import { EXIT_CODES } from './types';

// Commands to test in integration
import { listCommand } from './commands/list';
import { getCommand } from './commands/get';
import { deleteCommand } from './commands/delete';
import { featuresListCommand } from './commands/features';

/**
 * Integration tests for CLI commands
 *
 * These tests simulate the full command execution flow with a mocked HTTP client,
 * testing the interaction between the command handler, formatter, and HTTP client.
 */
describe('CLI Integration Tests', () => {
  let log: ToolingLog;
  let logWriter: ToolingLogCollectingWriter;
  let mockHttpClient: jest.Mocked<HttpClient>;
  let stdoutOutput: string[];
  let stdoutWriteSpy: jest.SpyInstance;
  let originalExitCode: number | undefined;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    // Setup logging
    log = new ToolingLog();
    logWriter = new ToolingLogCollectingWriter();
    log.setWriters([logWriter]);

    // Setup mock HTTP client
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

    // Capture stdout
    stdoutOutput = [];
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      stdoutOutput.push(chunk.toString());
      return true;
    });

    // Save and reset exit code
    originalExitCode = process.exitCode;
    process.exitCode = undefined;

    // Save TTY state
    originalIsTTY = process.stdin.isTTY;
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
    process.exitCode = originalExitCode;
    process.stdin.isTTY = originalIsTTY as boolean;
  });

  function createRunContext(options: {
    positionalArgs?: string[];
    flags?: Record<string, unknown>;
    isJsonMode?: boolean;
  }) {
    const flagValues: Record<string, unknown> = {
      _: options.positionalArgs || [],
      json: options.isJsonMode || false,
      yes: options.flags?.yes || false,
      ...(options.flags || {}),
    };

    return {
      httpClient: mockHttpClient,
      log,
      flags: flagValues,
      flagsReader: {
        string: jest.fn((name: string) => flagValues[name] as string | undefined),
        boolean: jest.fn((name: string) => Boolean(flagValues[name])),
        arrayOfStrings: jest.fn(() => []),
        number: jest.fn(),
        enum: jest.fn(),
        path: jest.fn(),
      } as unknown as FlagsReader,
      addCleanupTask: jest.fn(),
      procRunner: {} as any,
    };
  }

  describe('Happy path: List streams', () => {
    it('lists streams in human-readable format', async () => {
      // Setup
      mockHttpClient.getPublic.mockResolvedValue({
        streams: [
          { name: 'logs' },
          { name: 'logs.nginx' },
          { name: 'metrics' },
        ],
      });

      // Execute
      const context = createRunContext({});
      await listCommand.run(context as any);

      // Verify
      expect(mockHttpClient.getPublic).toHaveBeenCalledWith('/api/streams');
      expect(process.exitCode).toBeUndefined();

      const logOutput = logWriter.messages.join('\n');
      expect(logOutput).toContain('Streams:');
      expect(logOutput).toContain('logs');
      expect(logOutput).toContain('logs.nginx');
      expect(logOutput).toContain('metrics');
    });

    it('lists streams in JSON format', async () => {
      // Setup
      const streams = [{ name: 'logs' }, { name: 'metrics' }];
      mockHttpClient.getPublic.mockResolvedValue({ streams });

      // Execute
      const context = createRunContext({ isJsonMode: true });
      await listCommand.run(context as any);

      // Verify
      expect(process.exitCode).toBeUndefined();
      expect(stdoutOutput.length).toBeGreaterThan(0);

      const output = JSON.parse(stdoutOutput[0]);
      expect(output).toEqual({ streams });
    });
  });

  describe('Happy path: Get stream', () => {
    it('gets stream details in human-readable format', async () => {
      // Setup
      const streamData = {
        name: 'logs',
        stream: {
          ingest: {
            routing: [{ destination: 'logs.nginx' }],
          },
        },
        inheritedFields: {},
      };
      mockHttpClient.getPublic.mockResolvedValue(streamData);

      // Execute
      const context = createRunContext({ positionalArgs: ['logs'] });
      await getCommand.run(context as any);

      // Verify
      expect(mockHttpClient.getPublic).toHaveBeenCalledWith('/api/streams/logs');
      expect(process.exitCode).toBeUndefined();

      const logOutput = logWriter.messages.join('\n');
      expect(logOutput).toContain('Stream: logs');
    });

    it('gets stream details in JSON format', async () => {
      // Setup
      const streamData = { name: 'logs', enabled: true };
      mockHttpClient.getPublic.mockResolvedValue(streamData);

      // Execute
      const context = createRunContext({ positionalArgs: ['logs'], isJsonMode: true });
      await getCommand.run(context as any);

      // Verify
      expect(process.exitCode).toBeUndefined();
      const output = JSON.parse(stdoutOutput[0]);
      expect(output.stream.name).toBe('logs');
    });
  });

  describe('Happy path: Features list', () => {
    it('lists features for a stream', async () => {
      // Setup
      mockHttpClient.getInternal.mockResolvedValue({
        features: [
          { id: 'feat1', name: 'Feature 1', type: 'classification' },
          { id: 'feat2', name: 'Feature 2' },
        ],
      });

      // Execute
      const context = createRunContext({ positionalArgs: ['logs'] });
      await featuresListCommand.run(context as any);

      // Verify
      expect(mockHttpClient.getInternal).toHaveBeenCalledWith(
        '/internal/streams/logs/features',
        {}
      );
      expect(process.exitCode).toBeUndefined();

      const logOutput = logWriter.messages.join('\n');
      expect(logOutput).toContain('Features:');
      expect(logOutput).toContain('Feature 1');
    });

    it('lists features in JSON format', async () => {
      // Setup
      const features = [{ id: 'feat1', name: 'Test Feature' }];
      mockHttpClient.getInternal.mockResolvedValue({ features });

      // Execute
      const context = createRunContext({ positionalArgs: ['logs'], isJsonMode: true });
      await featuresListCommand.run(context as any);

      // Verify
      const output = JSON.parse(stdoutOutput[0]);
      expect(output).toEqual({ features });
    });
  });

  describe('Error path: Stream not found (404)', () => {
    it('handles 404 error gracefully in human-readable mode', async () => {
      // Setup
      const error = new HttpError('Stream not found', 404, { message: 'Stream not found' });
      mockHttpClient.getPublic.mockRejectedValue(error);

      // Execute
      const context = createRunContext({ positionalArgs: ['nonexistent'] });
      await getCommand.run(context as any);

      // Verify
      expect(process.exitCode).toBe(EXIT_CODES.GENERAL_ERROR);
      const logOutput = logWriter.messages.join('\n');
      expect(logOutput).toContain('Stream not found');
    });

    it('outputs error as JSON in JSON mode', async () => {
      // Setup
      const error = new HttpError('Stream not found', 404, { message: 'Stream not found' });
      mockHttpClient.getPublic.mockRejectedValue(error);

      // Execute
      const context = createRunContext({ positionalArgs: ['nonexistent'], isJsonMode: true });
      await getCommand.run(context as any);

      // Verify
      expect(process.exitCode).toBe(EXIT_CODES.GENERAL_ERROR);
      const output = JSON.parse(stdoutOutput[0]);
      expect(output).toEqual({
        error: 'Stream not found',
        statusCode: 404,
      });
    });
  });

  describe('Error path: Server error (500)', () => {
    it('handles 500 error gracefully', async () => {
      // Setup
      const error = new HttpError('Internal server error', 500, { error: 'Internal server error' });
      mockHttpClient.getPublic.mockRejectedValue(error);

      // Execute
      const context = createRunContext({});
      await listCommand.run(context as any);

      // Verify
      expect(process.exitCode).toBe(EXIT_CODES.GENERAL_ERROR);
    });
  });

  describe('Error path: Flag validation', () => {
    it('throws error when required stream name is missing', async () => {
      // Execute & Verify
      const context = createRunContext({ positionalArgs: [] });
      await expect(getCommand.run(context as any)).rejects.toThrow(/stream name is required/i);
    });

    it('throws error when required feature id is missing for delete', async () => {
      const { featuresDeleteCommand } = await import('./commands/features');

      // Execute & Verify
      const context = createRunContext({ positionalArgs: ['logs'] });
      await expect(featuresDeleteCommand.run(context as any)).rejects.toThrow(/--id/i);
    });
  });

  describe('Destructive operations: Delete with confirmation', () => {
    beforeEach(() => {
      // Disable TTY to skip confirmation prompts
      process.stdin.isTTY = false;
    });

    it('deletes stream when --yes flag is provided', async () => {
      // Setup
      mockHttpClient.deletePublic.mockResolvedValue({ acknowledged: true });

      // Execute (TTY disabled, so no prompt)
      const context = createRunContext({
        positionalArgs: ['logs.nginx'],
        flags: { yes: true },
      });
      await deleteCommand.run(context as any);

      // Verify
      expect(mockHttpClient.deletePublic).toHaveBeenCalledWith('/api/streams/logs.nginx');
      expect(process.exitCode).toBeUndefined();
    });

    it('outputs deletion confirmation in JSON mode', async () => {
      // Setup
      mockHttpClient.deletePublic.mockResolvedValue({ acknowledged: true });

      // Execute
      const context = createRunContext({
        positionalArgs: ['logs.nginx'],
        isJsonMode: true,
        flags: { yes: true },
      });
      await deleteCommand.run(context as any);

      // Verify
      const output = JSON.parse(stdoutOutput[0]);
      expect(output).toEqual({ success: true, acknowledged: true });
    });
  });

  describe('Empty results handling', () => {
    it('handles empty stream list gracefully', async () => {
      // Setup
      mockHttpClient.getPublic.mockResolvedValue({ streams: [] });

      // Execute
      const context = createRunContext({});
      await listCommand.run(context as any);

      // Verify
      expect(process.exitCode).toBeUndefined();
      const logOutput = logWriter.messages.join('\n');
      expect(logOutput).toContain('No streams found');
    });

    it('handles empty features list gracefully', async () => {
      // Setup
      mockHttpClient.getInternal.mockResolvedValue({ features: [] });

      // Execute
      const context = createRunContext({ positionalArgs: ['logs'] });
      await featuresListCommand.run(context as any);

      // Verify
      expect(process.exitCode).toBeUndefined();
      const logOutput = logWriter.messages.join('\n');
      expect(logOutput).toContain('No features found');
    });
  });

  describe('Special characters in stream names', () => {
    it('handles stream names with dots', async () => {
      // Setup
      mockHttpClient.getPublic.mockResolvedValue({
        name: 'logs.nginx.access',
        stream: {},
      });

      // Execute
      const context = createRunContext({ positionalArgs: ['logs.nginx.access'] });
      await getCommand.run(context as any);

      // Verify - note: dots are not URL encoded as they are valid in paths
      expect(mockHttpClient.getPublic).toHaveBeenCalledWith('/api/streams/logs.nginx.access');
    });
  });
});
