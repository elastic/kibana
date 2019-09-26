/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import lzString from 'lz-string';
import { historyProvider } from '../history_provider';

function createState() {
  return {
    transient: {
      selectedPage: 'page-f3ce-4bb7-86c8-0417606d6592',
      selectedToplevelNodes: ['element-d88c-4bbd-9453-db22e949b92e'],
      resolvedArgs: {},
    },
    persistent: {
      schemaVersion: 0,
      time: new Date().getTime(),
    },
  };
}

describe.skip('historyProvider', () => {
  let history;
  let state;

  beforeEach(() => {
    history = historyProvider();
    state = createState();
  });

  describe('instances', () => {
    it('should return the same instance for the same window object', () => {
      expect(historyProvider()).to.equal(history);
    });

    it('should return different instance for different window object', () => {
      const newWindow = {};
      expect(historyProvider(newWindow)).not.to.be(history);
    });
  });

  describe('push updates', () => {
    beforeEach(() => {
      history.push(state);
    });

    afterEach(() => {
      // reset state back to initial after each test
      history.undo();
    });

    describe('push', () => {
      it('should add state to location', () => {
        expect(history.getLocation().state).to.eql(state);
      });

      it('should push compressed state into history', () => {
        const hist = history.historyInstance;
        expect(hist.location.state).to.equal(lzString.compress(JSON.stringify(state)));
      });
    });

    describe.skip('undo', () => {
      it('should move history back', () => {
        // pushed location has state value
        expect(history.getLocation().state).to.eql(state);

        // back to initial location with null state
        history.undo();
        expect(history.getLocation().state).to.be(null);
      });
    });

    describe.skip('redo', () => {
      it('should move history forward', () => {
        // back to initial location, with null state
        history.undo();
        expect(history.getLocation().state).to.be(null);

        // return to pushed location, with state value
        history.redo();
        expect(history.getLocation().state).to.eql(state);
      });
    });
  });

  describe.skip('replace updates', () => {
    beforeEach(() => {
      history.replace(state);
    });

    afterEach(() => {
      // reset history to default after each test
      history.replace(null);
    });

    describe('replace', () => {
      it('should replace state in window history', () => {
        expect(history.getLocation().state).to.eql(state);
      });

      it('should replace compressed state into history', () => {
        const hist = history.historyInstance;
        expect(hist.location.state).to.equal(lzString.compress(JSON.stringify(state)));
      });
    });
  });

  describe('onChange', () => {
    const createOnceHandler = (history, done, fn) => {
      const teardown = history.onChange((location, prevLocation) => {
        if (typeof fn === 'function') {
          fn(location, prevLocation);
        }
        teardown();
        done();
      });
    };

    it('should return a method to remove the listener', () => {
      const handler = () => 'hello world';
      const teardownFn = history.onChange(handler);

      expect(teardownFn).to.be.a('function');

      // teardown the listener
      teardownFn();
    });

    it('should call handler on state change', done => {
      createOnceHandler(history, done, loc => {
        expect(loc).to.be.a('object');
      });

      history.push({});
    });

    it('should pass location object to handler', done => {
      createOnceHandler(history, done, location => {
        expect(location.pathname).to.be.a('string');
        expect(location.hash).to.be.a('string');
        expect(location.state).to.be.an('object');
        expect(location.action).to.equal('push');
      });

      history.push(state);
    });

    it('should pass decompressed state to handler', done => {
      createOnceHandler(history, done, ({ state: curState }) => {
        expect(curState).to.eql(state);
      });

      history.push(state);
    });

    it('should pass in the previous location object to handler', done => {
      createOnceHandler(history, done, (location, prevLocation) => {
        expect(prevLocation.pathname).to.be.a('string');
        expect(prevLocation.hash).to.be.a('string');
        expect(prevLocation.state).to.be(null);
        expect(prevLocation.action).to.equal('push');
      });

      history.push(state);
    });
  });

  describe('resetOnChange', () => {
    // the history onChange handler was made async and now there's no way to know when the handler was called
    // TODO: restore these tests.
    it.skip('removes listeners', () => {
      const createHandler = () => {
        let callCount = 0;

        function handlerFn() {
          callCount += 1;
        }
        handlerFn.getCallCount = () => callCount;

        return handlerFn;
      };

      const handler1 = createHandler();
      const handler2 = createHandler();

      // attach and test the first handler
      history.onChange(handler1);

      expect(handler1.getCallCount()).to.equal(0);
      history.push({});
      expect(handler1.getCallCount()).to.equal(1);

      // attach and test the second handler
      history.onChange(handler2);

      expect(handler2.getCallCount()).to.equal(0);
      history.push({});
      expect(handler1.getCallCount()).to.equal(2);
      expect(handler2.getCallCount()).to.equal(1);

      // remove all handlers
      history.resetOnChange();
      history.push({});
      expect(handler1.getCallCount()).to.equal(2);
      expect(handler2.getCallCount()).to.equal(1);
    });
  });

  describe('parse', () => {
    it('returns the decompressed object', () => {
      history.push(state);

      const hist = history.historyInstance;
      const rawState = hist.location.state;

      expect(rawState).to.be.a('string');
      expect(history.parse(rawState)).to.eql(state);
    });

    it('returns null with invalid JSON', () => {
      expect(history.parse('hello')).to.be(null);
    });
  });

  describe('encode', () => {
    it('returns the compressed string', () => {
      history.push(state);

      const hist = history.historyInstance;
      const rawState = hist.location.state;

      expect(rawState).to.be.a('string');
      expect(history.encode(state)).to.eql(rawState);
    });
  });
});
