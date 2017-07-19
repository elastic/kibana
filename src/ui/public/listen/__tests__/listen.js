import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/listen';
import { EventsProvider } from 'ui/events';

describe('listen component', function () {

  let $rootScope;
  let Events;


  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector, Private) {
    $rootScope = $injector.get('$rootScope');
    Events = Private(EventsProvider);
  }));

  it('exposes the $listen method on all scopes', function () {
    expect($rootScope.$listen).to.be.a('function');
    expect($rootScope.$new().$listen).to.be.a('function');
  });

  it('binds to an event emitter', function () {
    const emitter = new Events();
    const $scope = $rootScope.$new();

    function handler() {}
    $scope.$listen(emitter, 'hello', handler);

    expect(emitter._listeners.hello).to.have.length(1);
    expect(emitter._listeners.hello[0].handler).to.be(handler);
  });

  it('binds to $scope, waiting for the destroy event', function () {
    const emitter = new Events();
    const $scope = $rootScope.$new();

    sinon.stub($scope, '$on');
    sinon.stub($rootScope, '$on');

    function handler() {}
    $scope.$listen(emitter, 'hello', handler);

    expect($rootScope.$on).to.have.property('callCount', 0);
    expect($scope.$on).to.have.property('callCount', 1);

    const call = $scope.$on.firstCall;
    expect(call.args[0]).to.be('$destroy');
    expect(call.args[1]).to.be.a('function');
  });

  it('unbinds the event handler when $destroy is triggered', function () {
    const emitter = new Events();
    const $scope = $rootScope.$new();

    sinon.stub($scope, '$on');
    sinon.stub(emitter, 'off');

    // set the listener
    function handler() {}
    $scope.$listen(emitter, 'hello', handler);

    // get the unbinder that was registered to $scope
    const unbinder = $scope.$on.firstCall.args[1];

    // call the unbinder
    expect(emitter.off).to.have.property('callCount', 0);
    unbinder();
    expect(emitter.off).to.have.property('callCount', 1);

    // check that the off args were as expected
    const call = emitter.off.firstCall;
    expect(call.args[0]).to.be('hello');
    expect(call.args[1]).to.be(handler);
  });
});
