/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { executeBashTool } from './execute_bash';

jest.mock('./load_just_bash', () => ({
  loadBash: jest.fn().mockImplementation(async () => {
    const mod = jest.requireActual('just-bash');
    return mod.Bash;
  }),
}));

const createMockContext = () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
  events: {
    reportProgress: jest.fn(),
  },
});

describe('executeBashTool', () => {
  const tool = executeBashTool();

  it('should have the correct tool id', () => {
    expect(tool.id).toBe(platformCoreTools.executeBash);
  });

  it('should have the correct type', () => {
    expect(tool.type).toBe('builtin');
  });

  it('should execute a simple echo command', async () => {
    const mockContext = createMockContext();
    const result = await tool.handler({ script: 'echo "hello world"' }, mockContext as any);

    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: {
            stdout: 'hello world\n',
            stderr: '',
            exitCode: 0,
          },
        },
      ],
    });
  });

  it('should support piped commands', async () => {
    const mockContext = createMockContext();
    const result = await tool.handler({ script: 'echo "hello world" | wc -w' }, mockContext as any);

    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: {
            stdout: expect.stringContaining('2'),
            stderr: '',
            exitCode: 0,
          },
        },
      ],
    });
  });

  it('should pre-populate files from the files parameter', async () => {
    const mockContext = createMockContext();
    const result = await tool.handler(
      {
        script: 'cat /data/greeting.txt',
        files: { '/data/greeting.txt': 'Hello from file!' },
      },
      mockContext as any
    );

    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: {
            stdout: 'Hello from file!',
            stderr: '',
            exitCode: 0,
          },
        },
      ],
    });
  });

  it('should process JSON with jq', async () => {
    const mockContext = createMockContext();
    const result = await tool.handler(
      {
        script: 'cat /data/input.json | jq ".name"',
        files: { '/data/input.json': '{"name":"Alice","age":30}' },
      },
      mockContext as any
    );

    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: {
            stdout: expect.stringContaining('Alice'),
            stderr: '',
            exitCode: 0,
          },
        },
      ],
    });
  });

  it('should report non-zero exit codes', async () => {
    const mockContext = createMockContext();
    const result = await tool.handler({ script: 'cat /nonexistent/file.txt' }, mockContext as any);

    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: {
            stdout: '',
            stderr: expect.any(String),
            exitCode: expect.any(Number),
          },
        },
      ],
    });
    expect((result as any).results[0].data.exitCode).not.toBe(0);
  });

  it('should report progress via events', async () => {
    const mockContext = createMockContext();
    await tool.handler({ script: 'echo test' }, mockContext as any);

    expect(mockContext.events.reportProgress).toHaveBeenCalledWith(
      'Executing bash script in virtual environment'
    );
  });

  it('should truncate long stdout', async () => {
    const mockContext = createMockContext();
    const result = await tool.handler({ script: 'seq 1 100000' }, mockContext as any);

    const data = (result as any).results[0].data;
    expect(data.stdout.length).toBeLessThanOrEqual(50_000 + 30);
    if (data.stdoutTruncated) {
      expect(data.stdout).toContain('[output truncated]');
    }
  });

  it('should execute bash variables and control flow', async () => {
    const mockContext = createMockContext();
    const result = await tool.handler(
      {
        script: 'total=0; for i in 1 2 3 4 5; do total=$((total + i)); done; echo $total',
      },
      mockContext as any
    );

    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: {
            stdout: '15\n',
            stderr: '',
            exitCode: 0,
          },
        },
      ],
    });
  });
});
