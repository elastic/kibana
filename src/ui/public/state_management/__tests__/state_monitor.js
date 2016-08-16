import expect from 'expect.js';
import sinon from 'sinon';
import { cloneDeep } from 'lodash';
import stateMonitor from 'ui/state_management/state_monitor';
import SimpleEmitter from 'ui/utils/SimpleEmitter';

describe('stateMonitor', function () {
  const noop = () => {};
  const eventTypes = [
    'save_with_changes',
    'reset_with_changes',
    'fetch_with_changes',
  ];

  let mockState;
  let stateJSON;

  function setState(mockState, obj, emit = true) {
    mockState.toJSON = () => cloneDeep(obj);
    stateJSON = cloneDeep(obj);
    if (emit) mockState.emit(eventTypes[0]);
  }

  function createMockState(state = {}) {
    const mockState = new SimpleEmitter();
    setState(mockState, state, false);
    return mockState;
  }

  beforeEach(() => {
    mockState = createMockState({});
  });

  it('should have a create method', function () {
    expect(stateMonitor).to.have.property('create');
    expect(stateMonitor.create).to.be.a('function');
  });

  describe('factory creation', function () {
    it('should not call onChange with only the state', function () {
      const monitor = stateMonitor.create(mockState);
      const changeStub = sinon.stub();
      monitor.onChange(changeStub);
      sinon.assert.notCalled(changeStub);
    });

    it('should not call onChange with matching defaultState', function () {
      const monitor = stateMonitor.create(mockState, {});
      const changeStub = sinon.stub();
      monitor.onChange(changeStub);
      sinon.assert.notCalled(changeStub);
    });

    it('should call onChange with differing defaultState', function () {
      const monitor = stateMonitor.create(mockState, { test: true });
      const changeStub = sinon.stub();
      monitor.onChange(changeStub);
      sinon.assert.calledOnce(changeStub);
    });
  });

  describe('instance', function () {
    let monitor;

    beforeEach(() => {
      monitor = stateMonitor.create(mockState);
    });

    describe('onChange', function () {
      it('should throw if not given a handler function', function () {
        const fn = () => monitor.onChange('not a function');
        expect(fn).to.throwException(/must be a function/);
      });

      eventTypes.forEach((eventType) => {
        describe(`when ${eventType} is emitted`, function () {
          let handlerFn;

          beforeEach(() => {
            handlerFn = sinon.stub();
            monitor.onChange(handlerFn);
            sinon.assert.notCalled(handlerFn);
          });

          it('should get called', function () {
            mockState.emit(eventType);
            sinon.assert.calledOnce(handlerFn);
          });

          it('should be given the state status', function () {
            mockState.emit(eventType);
            const args = handlerFn.firstCall.args;
            expect(args[0]).to.be.an('object');
            expect(args[0]).to.have.property('clean', true);
            expect(args[0]).to.have.property('dirty', false);
          });

          it('should be given the event type', function () {
            mockState.emit(eventType);
            const args = handlerFn.firstCall.args;
            expect(args[1]).to.equal(eventType);
          });

          it('should be given the changed keys', function () {
            const keys = ['one', 'two', 'three'];
            mockState.emit(eventType, keys);
            const args = handlerFn.firstCall.args;
            expect(args[2]).to.equal(keys);
          });
        });
      });
    });

    describe('destroy', function () {
      let stateSpy;
      let cleanMethod;

      beforeEach(() => {
        stateSpy = sinon.spy(mockState, 'off');
        sinon.assert.notCalled(stateSpy);
      });

      it('should remove the listeners', function () {
        monitor.onChange(noop);
        monitor.destroy();
        sinon.assert.callCount(stateSpy, eventTypes.length);
        eventTypes.forEach((eventType) => {
          sinon.assert.calledWith(stateSpy, eventType);
        });
      });

      it('should stop the instance from being used any more', function () {
        monitor.onChange(noop);
        monitor.destroy();
        const fn = () => monitor.onChange(noop);
        expect(fn).to.throwException(/has been destroyed/);
      });
    });
  });
});