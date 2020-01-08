/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import EventEmitter from 'events';
import expect from '@kbn/expect';
import { mirrorPluginStatus } from '../mirror_plugin_status';

describe('mirror_plugin_status', () => {
  class MockPluginStatus extends EventEmitter {
    constructor() {
      super();
      this.state = 'uninitialized';
    }

    _changeState(newState, newMessage) {
      if (this.state === newState) {
        return;
      }
      const prevState = this.state;
      const prevMessage = this.message;

      this.state = newState;
      this.message = newMessage;

      this.emit(newState, prevState, prevMessage, this.state, this.message);
      this.emit('change', prevState, prevMessage, this.state, this.message);
    }

    red(message) {
      this._changeState('red', message);
    }
    yellow(message) {
      this._changeState('yellow', message);
    }
    green(message) {
      this._changeState('green', message);
    }
    uninitialized(message) {
      this._changeState('uninitialized', message);
    }
  }

  class MockPlugin {
    constructor() {
      this.status = new MockPluginStatus();
    }
  }

  let upstreamPlugin;
  let downstreamPlugin;
  let eventNotEmittedTimeout;

  beforeEach(() => {
    upstreamPlugin = new MockPlugin();
    downstreamPlugin = new MockPlugin();
    eventNotEmittedTimeout = setTimeout(() => {
      throw new Error('Event should have been emitted');
    }, 100);
  });

  it('should mirror all downstream plugin statuses to upstream plugin statuses', done => {
    mirrorPluginStatus(upstreamPlugin, downstreamPlugin);
    downstreamPlugin.status.on('change', () => {
      clearTimeout(eventNotEmittedTimeout);
      expect(downstreamPlugin.status.state).to.be('red');
      expect(downstreamPlugin.status.message).to.be('test message');
      done();
    });
    upstreamPlugin.status.red('test message');
  });

  describe('should only mirror specific downstream plugin statuses to corresponding upstream plugin statuses: ', () => {
    beforeEach(() => {
      mirrorPluginStatus(upstreamPlugin, downstreamPlugin, 'yellow', 'red');
    });

    it('yellow', done => {
      downstreamPlugin.status.on('change', () => {
        clearTimeout(eventNotEmittedTimeout);
        expect(downstreamPlugin.status.state).to.be('yellow');
        expect(downstreamPlugin.status.message).to.be('test yellow message');
        done();
      });
      upstreamPlugin.status.yellow('test yellow message');
    });

    it('red', done => {
      downstreamPlugin.status.on('change', () => {
        clearTimeout(eventNotEmittedTimeout);
        expect(downstreamPlugin.status.state).to.be('red');
        expect(downstreamPlugin.status.message).to.be('test red message');
        done();
      });
      upstreamPlugin.status.red('test red message');
    });

    it('not green', () => {
      clearTimeout(eventNotEmittedTimeout); // because event should not be emitted in this test
      downstreamPlugin.status.on('change', () => {
        throw new Error('Event should NOT have been emitted');
      });
      upstreamPlugin.status.green('test green message');
    });
  });
});
