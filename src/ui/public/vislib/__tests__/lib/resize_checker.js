import $ from 'jquery';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';
import { ResizeCheckerProvider } from 'ui/vislib/lib/resize_checker';
import { EventsProvider } from 'ui/events';
import { ReflowWatcherProvider } from 'ui/reflow_watcher';

describe('Vislib Resize Checker', function () {
  const sandbox = sinon.sandbox.create();
  require('test_utils/no_digest_promises').activateForSuite();

  let ResizeChecker;
  let EventEmitter;
  let checker;
  let reflowWatcher;
  const reflowSpies = {};

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (Private) {
    ResizeChecker = Private(ResizeCheckerProvider);
    EventEmitter = Private(EventsProvider);
    reflowWatcher = Private(ReflowWatcherProvider);
    reflowSpies.on = sinon.spy(reflowWatcher, 'on');
    reflowSpies.off = sinon.spy(reflowWatcher, 'off');

    const $el = $(document.createElement('div'))
    .appendTo('body')
    .css('visibility', 'hidden')
    .get(0);

    checker = new ResizeChecker($el);
  }));

  afterEach(function () {
    checker.$el.remove();
    checker.destroy();

    sandbox.restore();
  });

  describe('basic functionality', function () {
    it('is an event emitter', function () {
      expect(checker).to.be.a(EventEmitter);
    });

    it('listens for the "reflow" event of the reflowWatchers', function () {
      expect(reflowSpies.on).to.have.property('callCount', 1);
      const call = reflowSpies.on.getCall(0);
      expect(call.args[0]).to.be('reflow');
    });

    it('emits a "resize" event when the el is resized', function (done) {
      checker.on('resize', function () {
        done();
      });

      checker.$el.text('haz contents');
      checker.check();
    });
  });

  describe('#read', function () {
    it('gets the proper dimensions for the element', function () {
      const dimensions = checker.read();
      const windowWidth = document.documentElement.clientWidth;

      expect(dimensions.w).to.equal(windowWidth);
      expect(dimensions.h).to.equal(0);
    });
  });

  describe('#saveSize', function () {
    it('calls #read() when no arg is passed', function () {
      const stub = sinon.stub(checker, 'read').returns({});

      checker.saveSize();

      expect(stub).to.have.property('callCount', 1);
    });

    it('saves the size of the element', function () {
      const football = {};
      checker.saveSize(football);
      expect(checker).to.have.property('_savedSize', football);
    });

    it('returns false if the size matches the previous value', function () {
      expect(checker.saveSize(checker._savedSize)).to.be(false);
    });

    it('returns true if the size is different than previous value', function () {
      expect(checker.saveSize({})).to.be(true);
    });
  });

  describe('#check()', function () {
    let emit;

    beforeEach(function () {
      emit = sinon.stub(checker, 'emit');

      // prevent the checker from auto-checking
      checker.destroy();
      checker.startSchedule = checker.continueSchedule = _.noop;
    });

    it('does not emit "resize" immediately after a resize, but waits for changes to stop', function () {
      expect(checker).to.have.property('_isDirty', false);

      checker.$el.css('height', 100);
      checker.check();

      expect(checker).to.have.property('_isDirty', true);
      expect(emit).to.have.property('callCount', 0);

      // no change in el size
      checker.check();

      expect(checker).to.have.property('_isDirty', false);
      expect(emit).to.have.property('callCount', 1);
    });

    it('emits "resize" based on MS_MAX_RESIZE_DELAY, even if el\'s constantly changing size', function () {
      const steps = _.random(5, 10);
      this.slow(steps * 10);

      // we are going to fake the delay using the fake clock
      const msStep = Math.floor(ResizeChecker.MS_MAX_RESIZE_DELAY / (steps - 1));
      const clock = sandbox.useFakeTimers();

      _.times(steps, function step(i) {
        checker.$el.css('height', 100 + i);
        checker.check();

        expect(checker).to.have.property('_isDirty', true);
        expect(emit).to.have.property('callCount', i > steps ? 1 : 0);

        clock.tick(msStep); // move the clock forward one step
      });

    });
  });

  describe('#destroy()', function () {
    it('removes the "reflow" event from the reflowWatcher', function () {
      const onCall = reflowSpies.on.getCall(0);
      const handler = onCall.args[1];

      checker.destroy();
      expect(reflowSpies.off).to.have.property('callCount', 1);
      expect(reflowSpies.off.calledWith('reflow', handler)).to.be.ok();
    });

    it('clears the timeout', function () {
      const spy = sandbox.spy(window, 'clearTimeout');
      checker.destroy();
      expect(spy).to.have.property('callCount', 1);
    });
  });

  describe('scheduling', function () {
    let clock;
    let schedule;

    beforeEach(function () {
      // prevent the checker from running automatically
      checker.destroy();
      clock = sandbox.useFakeTimers();

      schedule = [];
      _.times(25, function () {
        schedule.push(_.random(3, 250));
      });
    });

    it('walks the schedule, using each value as it\'s next timeout', function () {
      let timerId = checker.startSchedule(schedule);

      // start at 0 even though "start" used the first slot, we will still check it
      for (let i = 0; i < schedule.length; i++) {
        expect(clock.timers[timerId]).to.have.property('callAt', schedule[i]);
        timerId = checker.continueSchedule();
      }
    });

    it('repeats the last value in the schedule', function () {
      checker.startSchedule(schedule);

      // start at 1, and go until there is one left
      for (let i = 1; i < schedule.length - 1; i++) {
        checker.continueSchedule();
      }

      const last = _.last(schedule);
      _.times(5, function () {
        const timer = clock.timers[checker.continueSchedule()];
        expect(timer).to.have.property('callAt', last);
      });
    });
  });
});
