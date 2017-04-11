import expect from 'expect.js';
import Chance from 'chance';
import { createLogLevelFlags } from '../log_levels';

const chance = new Chance();

describe('createLogLevelFlags()', () => {
  describe('logLevel=silent', () => {
    it('produces correct map', () => {
      expect(createLogLevelFlags('silent')).to.eql({
        silent: true,
        error: false,
        warning: false,
        info: false,
        debug: false,
        verbose: false,
      });
    });
  });

  describe('logLevel=error', () => {
    it('produces correct map', () => {
      expect(createLogLevelFlags('error')).to.eql({
        silent: true,
        error: true,
        warning: false,
        info: false,
        debug: false,
        verbose: false,
      });
    });
  });

  describe('logLevel=warning', () => {
    it('produces correct map', () => {
      expect(createLogLevelFlags('warning')).to.eql({
        silent: true,
        error: true,
        warning: true,
        info: false,
        debug: false,
        verbose: false,
      });
    });
  });

  describe('logLevel=info', () => {
    it('produces correct map', () => {
      expect(createLogLevelFlags('info')).to.eql({
        silent: true,
        error: true,
        warning: true,
        info: true,
        debug: false,
        verbose: false,
      });
    });
  });

  describe('logLevel=debug', () => {
    it('produces correct map', () => {
      expect(createLogLevelFlags('debug')).to.eql({
        silent: true,
        error: true,
        warning: true,
        info: true,
        debug: true,
        verbose: false,
      });
    });
  });

  describe('logLevel=verbose', () => {
    it('produces correct map', () => {
      expect(createLogLevelFlags('verbose')).to.eql({
        silent: true,
        error: true,
        warning: true,
        info: true,
        debug: true,
        verbose: true,
      });
    });
  });

  describe('invalid logLevel', () => {
    it('throws error', () => {
      // avoid the impossiblity that a valid level is generated
      // by specifying a long length
      const level = chance.word({ length: 10 });

      expect(() => createLogLevelFlags(level))
        .to.throwError(level);
    });
  });
});
