import expect from 'expect.js';
import sinon from 'sinon';
import monitorStateChanges from 'ui/state_management/monitor_changes';
import SimpleEmitter from 'ui/utils/SimpleEmitter';

describe('monitorStateChanges', function () {
  const noop = () => {};
  const eventTypes = [
    'save_with_changes',
    'reset_with_changes',
    'fetch_with_changes',
  ];
  let mockState;

  beforeEach(() => {
    mockState = new SimpleEmitter();
  });

  describe('sanity checks', function () {
    it('should throw if not given a handler function', function () {
      const fn = () => monitorStateChanges(mockState, 'not a function');
      expect(fn).to.throwException(/must be a listener function/);
    });

    it('should throw if not given a valid cleanup function', function () {
      const fn = () => monitorStateChanges(mockState, noop, 'not a function');
      expect(fn).to.throwException(/must be a cleanup function/);
    });
  });

  describe('calling the event handler', function () {
    eventTypes.forEach((eventType) => {
      describe(eventType, function () {
        let handlerFn;

        beforeEach(() => {
          handlerFn = sinon.stub();
        });

        it('should get called', function () {
          monitorStateChanges(mockState, handlerFn, noop);
          sinon.assert.notCalled(handlerFn);
          mockState.emit(eventType);
          sinon.assert.calledOnce(handlerFn);
        });

        it('should be passed the event type', function () {
          monitorStateChanges(mockState, handlerFn, noop);
          mockState.emit(eventType);
          const args = handlerFn.firstCall.args;
          expect(args[0]).to.equal(eventType);
        });

        it('should be passed the changed keys', function () {
          const keys = ['one', 'two', 'three'];
          monitorStateChanges(mockState, handlerFn, noop);
          mockState.emit(eventType, keys);
          const args = handlerFn.firstCall.args;
          expect(args[1]).to.equal(keys);
        });
      });
    });
  });

  describe('cleanup handler', function () {
    let cleanFn;

    beforeEach(() => {
      cleanFn = sinon.stub();
    });

    describe('handler function', function () {
      it('should be called immediately', function () {
        sinon.assert.notCalled(cleanFn);
        monitorStateChanges(mockState, noop, cleanFn);
        sinon.assert.calledOnce(cleanFn);
      });

      it('should be given a cleanup function', function () {
        monitorStateChanges(mockState, noop, cleanFn);
        const arg = cleanFn.firstCall.args[0];
        expect(arg).to.be.a('function');
      });
    });

    describe('passed method', function () {
      let stateSpy;
      let cleanMethod;

      beforeEach(() => {
        stateSpy = sinon.spy(mockState, 'off');
        monitorStateChanges(mockState, noop, cleanFn);
        cleanMethod = cleanFn.firstCall.args[0];
      });

      it('should remove the listeners', function () {
        sinon.assert.notCalled(stateSpy);
        cleanMethod();
        sinon.assert.callCount(stateSpy, eventTypes.length);
        eventTypes.forEach((eventType) => {
          sinon.assert.calledWith(stateSpy, eventType);
        });
      });
    });
  });

});
