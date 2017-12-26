import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import { Direction } from '../keyboard_move';
import { keyCodes } from '@elastic/eui';

describe('keyboardMove directive', () => {

  let $compile;
  let $rootScope;

  function createTestButton(callback) {
    const scope = $rootScope.$new();
    scope.callback = callback;
    return $compile('<button keyboard-move="callback(direction)">Test</button>')(scope);
  }

  function createKeydownEvent(keyCode) {
    const e = angular.element.Event('keydown'); // eslint-disable-line new-cap
    e.which = keyCode;
    return e;
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((_$rootScope_, _$compile_) => {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  it('should call the callback when pressing up', () => {
    const spy = sinon.spy();
    const button = createTestButton(spy);
    button.trigger(createKeydownEvent(keyCodes.UP));
    expect(spy.calledWith(Direction.up)).to.be(true);
  });

  it('should call the callback when pressing down', () => {
    const spy = sinon.spy();
    const button = createTestButton(spy);
    button.trigger(createKeydownEvent(keyCodes.DOWN));
    expect(spy.calledWith(Direction.down)).to.be(true);
  });
});
