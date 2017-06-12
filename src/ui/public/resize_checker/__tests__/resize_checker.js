import $ from 'jquery';
import { delay } from 'bluebird';
import expect from 'expect.js';
import sinon from 'sinon';

import ngMock from 'ng_mock';
import { EventsProvider } from 'ui/events';
import NoDigestPromises from 'test_utils/no_digest_promises';

import { ResizeCheckerProvider } from '../resize_checker';

describe('Resize Checker', () => {
  NoDigestPromises.activateForSuite();

  const teardown = [];
  let setup;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(($injector) => {
    setup = () => {
      const Private = $injector.get('Private');
      const ResizeChecker = Private(ResizeCheckerProvider);
      const EventEmitter = Private(EventsProvider);

      const createEl = () => {
        const el = $('<div>').appendTo('body').get(0);
        teardown.push(() => $(el).remove());
        return el;
      };

      const createChecker = el => {
        const checker = new ResizeChecker(el);
        teardown.push(() => checker.destroy());
        return checker;
      };

      const createListener = () => {
        let resolveFirstCallPromise;
        const listener = sinon.spy(() => resolveFirstCallPromise());
        listener.firstCallPromise = new Promise(resolve => (resolveFirstCallPromise = resolve));
        return listener;
      };

      return { EventEmitter, createEl, createChecker, createListener };
    };
  }));

  afterEach(() => {
    teardown.splice(0).forEach(fn => {
      fn();
    });
  });

  describe('contruction', () => {
    it('accepts a jQuery wrapped element', () => {
      const { createChecker } = setup();

      createChecker($('<div>'));
    });
  });

  describe('events', () => {
    it('is an event emitter', () => {
      const { createEl, createChecker, EventEmitter } = setup();

      const checker = createChecker(createEl());
      expect(checker).to.be.a(EventEmitter);
    });

    it('emits a "resize" event asynchronously', async () => {
      const { createEl, createChecker, createListener } = setup();

      const el = createEl();
      const checker = createChecker(el);
      const listener = createListener();

      checker.on('resize', listener);
      $(el).height(100);
      sinon.assert.notCalled(listener);
      await listener.firstCallPromise;
      sinon.assert.calledOnce(listener);
    });
  });

  describe('#modifySizeWithoutTriggeringResize()', () => {
    it(`does not emit "resize" events caused by the block`, async () => {
      const { createChecker, createEl, createListener } = setup();

      const el = createEl();
      const checker = createChecker(el);
      const listener = createListener();

      checker.on('resize', listener);
      checker.modifySizeWithoutTriggeringResize(() => {
        $(el).height(100);
      });
      await delay(1000);
      sinon.assert.notCalled(listener);
    });

    it('does emit "resize" when modification is made between the block and resize notification', async () => {
      const { createChecker, createEl, createListener } = setup();

      const el = createEl();
      const checker = createChecker(el);
      const listener = createListener();

      checker.on('resize', listener);
      checker.modifySizeWithoutTriggeringResize(() => {
        $(el).height(100);
      });
      sinon.assert.notCalled(listener);
      $(el).height(200);
      await listener.firstCallPromise;
      sinon.assert.calledOnce(listener);
    });
  });

  describe('#destroy()', () => {
    it('destroys internal observer instance', () => {
      const { createChecker, createEl, createListener } = setup();

      const checker = createChecker(createEl());
      createListener();

      checker.destroy();
      expect(!checker._observer).to.be(true);
    });

    it('does not emit future resize events', async () => {
      const { createChecker, createEl, createListener } = setup();

      const el = createEl();
      const checker = createChecker(el);
      const listener = createListener();

      checker.on('resize', listener);
      checker.destroy();

      $(el).height(100);
      await delay(1000);
      sinon.assert.notCalled(listener);
    });
  });
});
