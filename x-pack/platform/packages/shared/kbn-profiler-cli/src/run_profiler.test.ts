/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import execa from 'execa';
import type { Overwrite } from 'utility-types';
import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { runProfiler } from './run_profiler';
import type { ProfilerCliFlags } from './flags';
import { ToolingLog } from '@kbn/tooling-log';
import * as fs from 'fs';
import { getProcessId } from './get_process_id';

const INSPECTOR_PORT = '9229';

// Use the real execa, but spy on `command` to observe calls in tests
jest.mock('execa', () => {
  const actual: typeof execa = jest.requireActual('execa');

  const mocked = {
    ...actual,
  } as ExecaMock;

  const boundCommand = mocked.command.bind(mocked);

  const module = {
    ...mocked,
    __esModule: true,
    default: actual,
  };

  module.command = module.default.command = jest
    .fn()
    .mockImplementation((...args: Parameters<ExecaMock['command']>) => {
      if (args[0].includes('speedscope')) {
        return Promise.resolve();
      }
      return boundCommand(...args);
    });

  return module;
});

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    mkdtemp: jest.fn().mockImplementation(() => '/foo'),
    readFile: jest.fn(),
  },
}));

// Create a properly typed mock instance of fs/promises
const mockFs = jest.mocked(fs);

type ExecaMock = Overwrite<
  typeof execa,
  { command: jest.MockedFunction<(typeof execa)['command']> }
>;

const mockedExeca = execa as unknown as ExecaMock;

interface FakeProcess {
  pid?: number;
  kill: () => void;
  process: ChildProcess;
}

function runProfilerWithFlags(flags: Partial<ProfilerCliFlags>) {
  return runProfiler({
    flags: {
      _: [],
      quiet: false,
      silent: false,
      unexpected: [],
      verbose: true,
      debug: true,
      help: false,
      'inspector-port': INSPECTOR_PORT,
      ...flags,
    },
    addCleanupTask: jest.fn(() => {}),
    log: new ToolingLog({
      level: 'verbose',
      writeTo: {
        write: (s) => {
          // console.log(s);
        },
      },
    }),
  });
}

/**
 * These tests don't reliably work on CI, so we skip.
 */
const descr = process.env.CI === 'true' ? describe.skip : describe;

descr('@kbn/profiler-cli real-process tests', () => {
  const processes: FakeProcess[] = [];

  function startProcess(code: string) {
    const process = spawn('node', ['-e', code], {
      stdio: 'pipe',
      detached: false,
    });

    const fp = {
      pid: process.pid,
      kill: () => process.kill('SIGTERM'),
      process,
    };

    processes.push(fp);

    return fp;
  }

  function startFakeLongLivedProcess(port: number): FakeProcess {
    // Start a simple Node.js HTTP server on the specified port
    return startProcess(`

    console.log('Long-lived process starting');

    const http = require('http');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Test server running');
    });
    server.listen(${port}, () => {
      console.log('Test server listening on port ${port}');
    });
    
    // Keep the process alive
    process.on('SIGTERM', () => {
      console.log('SIGTERM, exiting');
      server.close(() => process.exit(0));
    });
    process.on('SIGINT', () => {
    console.log('SIGINT, exiting');
      server.close(() => process.exit(0));
    });
  `);
  }

  beforeEach(() => {
    mockedExeca.command.mockClear();
  });

  afterEach(async () => {
    // Kill all spawned processes and wait for them to exit so port 9229 is freed
    const exitPromises = processes.map(
      (fp) =>
        new Promise<void>((resolve) => {
          // Resolve on either 'exit' or 'close'
          const done = () => resolve();
          fp.process.once('exit', done);
          fp.process.once('close', done);
        })
    );

    processes.forEach((fp) => {
      try {
        fp.kill();
      } catch (_) {
        // ignore
      }
    });

    await Promise.all(exitPromises);

    const pid = await getProcessId({ ports: [Number(INSPECTOR_PORT)], grep: false });

    if (pid) {
      await execa.command(`kill -9 ${pid}`);
    }

    processes.length = 0;
  });

  test('attaches to a running Node.js process at 5601/5603 by default and collects CPU profile', async () => {
    startFakeLongLivedProcess(5601);

    const runPromise = runProfilerWithFlags({
      timeout: '1s',
    });

    await runPromise;
    expect(mockFs.promises.writeFile).toHaveBeenCalled();
  });

  test('spawns a process, attaches debugger, waits for completion, and collects profile', async () => {
    const runPromise = runProfilerWithFlags({
      spawn: true,
      _: [
        `node`,
        '-e',
        `// Simulate some CPU work
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
          result += Math.sqrt(i);
        }
        
        console.log('Work completed, result:', result);
        setTimeout(( ) => {
        console.log('exiting');
          process.exit(0);
        }, 1000);
      `,
      ],
    });

    await runPromise;

    expect(mockFs.promises.writeFile).toHaveBeenCalled();
  });

  test('attaches, runs a command until completion, then stops and collects profile', async () => {
    startFakeLongLivedProcess(5601);

    const runPromise = runProfilerWithFlags({
      _: [
        `node`,
        '-e',
        `console.log('Short-lived process starting');

        setTimeout(( ) => {
          process.exit(0);
        }, 1000);
      `,
      ],
    });

    await runPromise;

    expect(mockFs.promises.writeFile).toHaveBeenCalled();
  });
});
