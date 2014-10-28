define(function (require) {
  var angular = require('angular');
  var sinon = require('test_utils/auto_release_sinon');

  // Load the kibana app dependencies.
  require('directives/validate_query');

  var $rootScope;
  var $timeout;
  var $compile;
  var Promise;
  var debounceDelay = 300;
  var $elemScope;
  var $elem;

  var cycleIndex = 0;
  var mockValidateQuery;
  var markup = '<input ng-model="mockModel" validate-query="mockQueryInput" input-focus type="text">';

  var validEsResponse = function () {
    return Promise.resolve({ valid: true });
  };

  var invalidEsResponse = function () {
    return Promise.reject({ body: { error: 'mock invalid query' } });
  };

  var checkClass = function (className) {
    expect($elem.hasClass(className)).to.be(true);
  };

  var init = function () {
    // Load the application
    module('kibana');

    module('kibana', function ($provide) {
      $provide.service('es', function () {
        return { indices: { validateQuery: function () {} } };
      });

      $provide.constant('configFile', {
        kibanaIndex: 'test-index'
      });
    });

    // Create the scope
    inject(function ($injector, _$rootScope_, _$compile_, _$timeout_, _Promise_) {
      $timeout = _$timeout_;
      $compile = _$compile_;
      Promise = _Promise_;

      // Give us a scope
      $rootScope = _$rootScope_;

      var es = $injector.get('es');
      mockValidateQuery = sinon.stub(es.indices, 'validateQuery');
    });
  };

  var compile = function () {
    $rootScope.mockModel = 'cycle' + cycleIndex++;
    $rootScope.mockQueryInput = undefined;

    $elem = angular.element(markup);
    $compile($elem)($rootScope);
    $elemScope = $elem.isolateScope();
    $rootScope.$digest();
  };

  describe('validate-query directive', function () {
    describe('initialization', function () {
      beforeEach(function () {
        init();
        mockValidateQuery.returns(validEsResponse());
        compile();
      });

      it('should use the model', function () {
        expect($elemScope).to.have.property('ngModel');
      });

      it('should call validate with changes', function () {
        // once for init
        expect(mockValidateQuery.callCount).to.be(1);

        $rootScope.mockModel = 'different input';
        $rootScope.$digest();
        // once on change (leading edge)
        expect(mockValidateQuery.callCount).to.be(2);
        $timeout.flush();
        // once on change (trailing edge)
        expect(mockValidateQuery.callCount).to.be(3);
      });
    });

    describe('valid querystring', function () {
      var mockValidateReturns;

      beforeEach(function () {
        init();
        mockValidateQuery.returns(validEsResponse());
        compile();
      });

      it('should set valid state', function () {
        // give angular time to set up the directive
        checkClass('ng-valid-query-input');
        checkClass('ng-valid');
      });
    });

    describe('invalid querystring', function () {
      var mockValidateReturns;

      beforeEach(function () {
        init();
        mockValidateQuery.returns(invalidEsResponse());
        compile();
      });

      it('should set invalid state', function () {
        checkClass('ng-invalid');
      });
    });

    describe('changing input', function () {
      it('should change validity based on response', function () {
        init();
        mockValidateQuery.onCall(0).returns(validEsResponse());
        compile();
        $rootScope.$digest();
        checkClass('ng-valid');

        // leading and trailing edges
        mockValidateQuery.onCall(1).returns(invalidEsResponse());
        mockValidateQuery.onCall(2).returns(invalidEsResponse());
        $rootScope.mockModel = 'invalid:';
        // trigger model change, which fires watcher
        $rootScope.$digest();
        // leading edge
        $timeout.flush(); // trailing edge
        checkClass('ng-invalid');

        // leading and trailing edges
        mockValidateQuery.onCall(3).returns(validEsResponse());
        mockValidateQuery.onCall(4).returns(validEsResponse());
        $rootScope.mockModel = 'valid';
        // trigger model change, which fires watcher
        $rootScope.$digest();
        // leading edge
        $timeout.flush(); // trailing edge
        checkClass('ng-valid');
      });
    });
  });
});
