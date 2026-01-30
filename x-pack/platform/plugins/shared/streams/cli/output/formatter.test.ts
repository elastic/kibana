/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Formatter } from './formatter';

describe('Formatter', () => {
  let mockLog: jest.Mocked<ToolingLog>;
  let stdoutWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLog = {
      write: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ToolingLog>;

    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });

  describe('json()', () => {
    it('writes JSON to stdout in JSON mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: true });
      const data = { foo: 'bar', count: 42 };

      formatter.json(data);

      expect(stdoutWriteSpy).toHaveBeenCalledWith('{"foo":"bar","count":42}\n');
      expect(mockLog.write).not.toHaveBeenCalled();
    });

    it('writes formatted JSON to log in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });
      const data = { foo: 'bar', count: 42 };

      formatter.json(data);

      expect(mockLog.write).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });
  });

  describe('message()', () => {
    it('writes to log in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });

      formatter.message('Hello, world!');

      expect(mockLog.write).toHaveBeenCalledWith('Hello, world!');
    });

    it('does not write in JSON mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: true });

      formatter.message('Hello, world!');

      expect(mockLog.write).not.toHaveBeenCalled();
    });
  });

  describe('success()', () => {
    it('writes success to log in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });

      formatter.success('Operation completed!');

      expect(mockLog.success).toHaveBeenCalledWith('Operation completed!');
    });

    it('does not write in JSON mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: true });

      formatter.success('Operation completed!');

      expect(mockLog.success).not.toHaveBeenCalled();
    });
  });

  describe('warning()', () => {
    it('writes warning to log in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });

      formatter.warning('Be careful!');

      expect(mockLog.warning).toHaveBeenCalledWith('Be careful!');
    });

    it('does not write in JSON mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: true });

      formatter.warning('Be careful!');

      expect(mockLog.warning).not.toHaveBeenCalled();
    });
  });

  describe('error()', () => {
    it('writes error JSON to stdout in JSON mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: true });

      formatter.error('Something went wrong', 404);

      expect(stdoutWriteSpy).toHaveBeenCalledWith('{"error":"Something went wrong","statusCode":404}\n');
      expect(mockLog.error).not.toHaveBeenCalled();
    });

    it('writes error JSON without status code if not provided', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: true });

      formatter.error('Something went wrong');

      expect(stdoutWriteSpy).toHaveBeenCalledWith('{"error":"Something went wrong"}\n');
    });

    it('writes error to log in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });

      formatter.error('Something went wrong', 404);

      expect(mockLog.error).toHaveBeenCalledWith('Something went wrong');
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });
  });

  describe('streamList()', () => {
    it('outputs streams as JSON in JSON mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: true });
      const streams = [{ name: 'logs' }, { name: 'metrics' }];

      formatter.streamList(streams);

      expect(stdoutWriteSpy).toHaveBeenCalledWith('{"streams":[{"name":"logs"},{"name":"metrics"}]}\n');
    });

    it('outputs formatted list in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });
      const streams = [{ name: 'logs' }, { name: 'metrics' }];

      formatter.streamList(streams);

      expect(mockLog.write).toHaveBeenCalledWith('Streams:');
      expect(mockLog.write).toHaveBeenCalledWith('  - logs');
      expect(mockLog.write).toHaveBeenCalledWith('  - metrics');
    });

    it('shows "No streams found" for empty list in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });

      formatter.streamList([]);

      expect(mockLog.write).toHaveBeenCalledWith('No streams found.');
    });

    it('includes stream type when available (wired)', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });
      const streams = [
        {
          name: 'logs',
          stream: {
            ingest: {
              routing: [{ destination: 'logs.nginx' }],
            },
          },
        },
      ];

      formatter.streamList(streams);

      expect(mockLog.write).toHaveBeenCalledWith('  - logs (wired)');
    });
  });

  describe('stream()', () => {
    it('outputs stream as JSON in JSON mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: true });
      const stream = { name: 'logs', enabled: true };

      formatter.stream(stream);

      expect(stdoutWriteSpy).toHaveBeenCalledWith('{"stream":{"name":"logs","enabled":true}}\n');
    });

    it('outputs formatted stream details in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });
      const stream = { name: 'logs', enabled: true, count: 42 };

      formatter.stream(stream);

      expect(mockLog.write).toHaveBeenCalledWith('Stream: logs');
      expect(mockLog.write).toHaveBeenCalledWith('  enabled: true');
      expect(mockLog.write).toHaveBeenCalledWith('  count: 42');
    });
  });

  describe('featureList()', () => {
    it('outputs features as JSON in JSON mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: true });
      const features = [{ id: 'feat1', name: 'Feature 1' }];

      formatter.featureList(features);

      expect(stdoutWriteSpy).toHaveBeenCalledWith('{"features":[{"id":"feat1","name":"Feature 1"}]}\n');
    });

    it('outputs formatted list in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });
      const features = [
        { id: 'feat1', name: 'Feature 1', type: 'classification' },
        { id: 'feat2', name: 'Feature 2' },
      ];

      formatter.featureList(features);

      expect(mockLog.write).toHaveBeenCalledWith('Features:');
      expect(mockLog.write).toHaveBeenCalledWith('  - Feature 1 (classification)');
      expect(mockLog.write).toHaveBeenCalledWith('  - Feature 2');
    });

    it('shows "No features found" for empty list in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });

      formatter.featureList([]);

      expect(mockLog.write).toHaveBeenCalledWith('No features found.');
    });

    it('uses id when name is not available', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });
      const features = [{ id: 'feat1' }];

      formatter.featureList(features);

      expect(mockLog.write).toHaveBeenCalledWith('  - feat1');
    });
  });

  describe('acknowledged()', () => {
    it('outputs success JSON in JSON mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: true });

      formatter.acknowledged('Stream created');

      expect(stdoutWriteSpy).toHaveBeenCalledWith('{"success":true,"acknowledged":true}\n');
    });

    it('outputs success message in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });

      formatter.acknowledged('Stream created');

      expect(mockLog.success).toHaveBeenCalledWith('Stream created successful.');
    });
  });

  describe('taskStatus()', () => {
    it('outputs status as JSON in JSON mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: true });
      const status = { state: 'running', progress: 50 };

      formatter.taskStatus(status);

      expect(stdoutWriteSpy).toHaveBeenCalledWith('{"status":{"state":"running","progress":50}}\n');
    });

    it('outputs formatted status in human mode', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });
      const status = { state: 'running', progress: 50 };

      formatter.taskStatus(status);

      expect(mockLog.write).toHaveBeenCalledWith('Task Status:');
      expect(mockLog.write).toHaveBeenCalledWith('  state: running');
      expect(mockLog.write).toHaveBeenCalledWith('  progress: 50');
    });

    it('handles nested objects in status', () => {
      const formatter = new Formatter({ log: mockLog, isJsonMode: false });
      const status = { details: { count: 10, items: ['a', 'b'] } };

      formatter.taskStatus(status);

      expect(mockLog.write).toHaveBeenCalledWith('Task Status:');
      expect(mockLog.write).toHaveBeenCalledWith('  details: {"count":10,"items":["a","b"]}');
    });
  });
});
