
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';

describe('$scope.$watchMulti', function () {

  let $rootScope;
  let $scope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    $rootScope = $injector.get('$rootScope');
    $scope = $rootScope.$new();
  }));

  describe('basic functionality', function () {
    it('exposes $watchMulti on all scopes', function () {
      expect($rootScope.$watchMulti).to.be.a('function');
      expect($scope).to.have.property('$watchMulti', $rootScope.$watchMulti);

      const $isoScope = $scope.$new(true);
      expect($isoScope).to.have.property('$watchMulti', $rootScope.$watchMulti);
    });

    it('returns a working unwatch function', function () {
      $scope.a = 0;
      $scope.b = 0;
      let triggers = 0;
      const unwatch = $scope.$watchMulti(['a', 'b'], function () { triggers++; });

      // initial watch
      $scope.$apply();
      expect(triggers).to.be(1);

      // prove that it triggers on chagne
      $scope.a++;
      $scope.$apply();
      expect(triggers).to.be(2);

      // remove watchers
      expect($scope.$$watchers).to.not.eql([]);
      unwatch();
      expect($scope.$$watchers).to.eql([]);

      // prove that it doesn't trigger anymore
      $scope.a++;
      $scope.$apply();
      expect(triggers).to.be(2);
    });
  });

  describe('simple scope watchers', function () {
    it('only triggers a single watch on initialization', function () {
      const stub = sinon.stub();

      $scope.$watchMulti([
        'one',
        'two',
        'three'
      ], stub);
      $rootScope.$apply();

      expect(stub.callCount).to.be(1);
    });

    it('only triggers a single watch when multiple values change', function () {
      const stub = sinon.spy(function () {});

      $scope.$watchMulti([
        'one',
        'two',
        'three'
      ], stub);

      $rootScope.$apply();
      expect(stub.callCount).to.be(1);

      $scope.one = 'a';
      $scope.two = 'b';
      $scope.three = 'c';
      $rootScope.$apply();

      expect(stub.callCount).to.be(2);
    });

    it('passes an array of the current and previous values, in order',
    function () {
      const stub = sinon.spy(function () {});

      $scope.one = 'a';
      $scope.two = 'b';
      $scope.three = 'c';
      $scope.$watchMulti([
        'one',
        'two',
        'three'
      ], stub);

      $rootScope.$apply();
      expect(stub.firstCall.args).to.eql([
        ['a', 'b', 'c'],
        ['a', 'b', 'c']
      ]);

      $scope.one = 'do';
      $scope.two = 're';
      $scope.three = 'mi';
      $rootScope.$apply();

      expect(stub.secondCall.args).to.eql([
        ['do', 're', 'mi'],
        ['a', 'b', 'c']
      ]);
    });

    it('always has an up to date value', function () {
      let count = 0;

      $scope.vals = [1, 0];
      $scope.$watchMulti([ 'vals[0]', 'vals[1]' ], function (cur) {
        expect(cur).to.eql($scope.vals);
        count++;
      });

      const $child = $scope.$new();
      $child.$watch('vals[0]', function (cur) {
        $child.vals[1] = cur;
      });

      $rootScope.$apply();
      expect(count).to.be(2);
    });
  });

  describe('complex watch expressions', function () {
    let stateWatchers;
    let firstValue;
    let secondValue;

    beforeEach(function () {
      const firstGetter = function () {
        return firstValue;
      };

      const secondGetter = function () {
        return secondValue;
      };

      stateWatchers = [{
        fn: $rootScope.$watch,
        get: firstGetter
      }, {
        fn: $rootScope.$watch,
        get: secondGetter
      }];
    });

    it('should trigger the watcher on initialization', function () {
      const stub = sinon.stub();
      firstValue = 'first';
      secondValue = 'second';

      $scope.$watchMulti(stateWatchers, stub);
      $rootScope.$apply();

      expect(stub.callCount).to.be(1);

      expect(stub.firstCall.args[0]).to.eql([firstValue, secondValue]);
      expect(stub.firstCall.args[1]).to.eql([firstValue, secondValue]);
    });
  });

  describe('nested watchers', function () {
    it('should trigger the handler at least once', function () {
      const $scope = $rootScope.$new();
      $scope.$$watchers = [{
        get: _.noop,
        fn: _.noop,
        eq: false,
        last: false
      }, {
        get: _.noop,
        fn: registerWatchers,
        eq: false,
        last: false
      }];

      const first = sinon.stub();
      const second = sinon.stub();

      function registerWatchers() {
        $scope.$watchMulti([first, second], function () {
          expect(first.callCount).to.be.greaterThan(0);
          expect(second.callCount).to.be.greaterThan(0);
        });
      }
      $scope.$digest();
    });
  });
});
