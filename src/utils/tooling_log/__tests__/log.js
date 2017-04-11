import expect from 'expect.js';
import Chance from 'chance';

import {
  createConcatStream,
  createPromiseFromStreams
} from '../../streams';

import { createToolingLog } from '../';

const chance = new Chance();
const capture = (level, block) => {
  const log = createToolingLog(level);
  block(log);
  log.end();
  return createPromiseFromStreams([ log, createConcatStream('') ]);
};

const nothingTest = (logLevel, method) => {
  describe(`#${method}(...any)`, () => {
    it('logs nothing', async () => {
      const output = await capture(logLevel, log => log[method]('foo'));
      expect(output).to.be('');
    });
  });
};

const somethingTest = (logLevel, method) => {
  describe(`#${method}(...any)`, () => {
    it('logs to output stream', async () => {
      const output = await capture(logLevel, log => log[method]('foo'));
      expect(output).to.contain('foo');
    });
  });
};

describe('utils: createToolingLog(logLevel, output)', () => {
  it('is a readable stream', async () => {
    const log = createToolingLog('debug');
    log.info('Foo');
    log.info('Bar');
    log.info('Baz');
    log.end();

    const output = await createPromiseFromStreams([
      log,
      createConcatStream('')
    ]);

    expect(output).to.contain('Foo');
    expect(output).to.contain('Bar');
    expect(output).to.contain('Baz');
  });

  describe('log level', () => {
    describe('logLevel=silent', () => {
      nothingTest('silent', 'debug');
      nothingTest('silent', 'info');
      nothingTest('silent', 'error');
    });
    describe('logLevel=error', () => {
      nothingTest('error', 'debug');
      nothingTest('error', 'info');
      somethingTest('error', 'error');
    });
    describe('logLevel=info', () => {
      nothingTest('info', 'debug');
      somethingTest('info', 'info');
      somethingTest('info', 'error');
    });
    describe('logLevel=debug', () => {
      somethingTest('debug', 'debug');
      somethingTest('debug', 'info');
      somethingTest('debug', 'error');
    });
    describe('invalid logLevel', () => {
      it('throw error', () => {
        // avoid the impossiblity that a valid level is generated
        // by specifying a long length
        const level = chance.word({ length: 10 });

        expect(() => createToolingLog(level))
          .to.throwError(level);
      });
    });
  });
});
