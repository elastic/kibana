import { resolve } from 'path';

import execa from 'execa';
import stripAnsi from 'strip-ansi';
import sinon from 'sinon';

import { watchStdioForLine } from '../watch_stdio_for_line';

describe('src/utils/watch_stdio_for_line', function () {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.reset());

  const onLogLine = sandbox.stub();
  const logFn = line => onLogLine(stripAnsi(line));

  it('calls logFn with log lines', async () => {
    const proc = execa(process.execPath, ['-e', 'console.log("hi")']);

    await watchStdioForLine(proc, logFn);

    // log output of the process
    sinon.assert.calledWithExactly(onLogLine, sinon.match(/info\s+hi/));
  });

  it('send the proc SIGKILL if it logs a line matching exitAfter regexp', async function () {
    // fixture proc will exit after 10 seconds if sigint not received, but the test won't fail
    // unless we see the log line `SIGINT not received`, so we let the test take up to 30 seconds
    // for potentially huge delays here and there
    this.timeout(30000);

    const proc = execa(process.execPath, [require.resolve('./fixtures/log_on_sigint')]);

    await watchStdioForLine(proc, logFn, /listening for SIGINT/);

    sinon.assert.calledWithExactly(onLogLine, sinon.match(/listening for SIGINT/));
    sinon.assert.neverCalledWith(onLogLine, sinon.match(/SIGINT not received/));
  });

  it('logs using level: option', async () => {
    const parentDir = resolve(process.cwd(), '..');

    const proc = execa(process.execPath, ['-e', 'console.log(process.cwd())'], {
      cwd: parentDir,
    });

    await watchStdioForLine(proc, logFn);

    // log output of the process, checking for \n to ensure cwd() doesn't log
    // the subdir that this process is executing in
    sinon.assert.calledWithExactly(onLogLine, sinon.match(parentDir + '\n'));
  });
});
