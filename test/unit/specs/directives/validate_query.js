define(function (require) {
  var angular = require('angular');
  var Promise = require('bluebird');
  var sinon = require('test_utils/auto_release_sinon');

  // Load the kibana app dependencies.
  require('directives/validate_query');

  var debounceDelay = 300;
  var $parentScope;
  var $elemScope;
  var $elem;
  var $compile;
  var $timeout;

  var mockValidateQuery;
  var mockScope = {
    ngModel: {query_string: {query: 'test_query'}},
    queryInput: undefined
  };

  var markup = '<input ng-model="mockModel" validate-query="mockQueryInput" input-focus type="text">';

  var checkRequest = function (index, query, type) {
    query = query || mockScope.ngModel;
    return {
      index: index,
      type: type,
      explain: true,
      ignoreUnavailable: true,
      body: {
        query: query || { match_all: {} }
      }
    };
  };

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
    inject(function ($injector, $rootScope, _$compile_, _$timeout_) {
      $timeout = _$timeout_;
      $compile = _$compile_;

      // Give us a scope
      $parentScope = $rootScope;
      $parentScope.mockModel = mockScope.ngModel;
      $parentScope.mockQueryInput = mockScope.queryInput;

      var es = $injector.get('es');
      mockValidateQuery = sinon.stub(es.indices, 'validateQuery');
    });
  };

  var compile = function () {
    $elem = angular.element(markup);
    $compile($elem)($parentScope);
    $elemScope = $elem.isolateScope();
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

      it('should call validate via watch setup', function () {
        expect(mockValidateQuery.callCount).to.be(1);
      });

      it('should call validate on input change', function () {
        // once for $watch, once for change
        var checkCount = 2;
        $elem.val('someValue');
        $elem.scope().$digest();
        expect(mockValidateQuery.callCount).to.be(checkCount);
      });
    });

    describe('valid querystring', function () {
      var mockValidateReturns = validEsResponse();

      beforeEach(function () {
        init();
        mockValidateQuery.returns(mockValidateReturns);
        compile();
      });

      it('should set valid state', function (done) {
        // give angular time to set up the directive
        mockValidateReturns.then(function () {
          checkClass('ng-valid-query-input');
          checkClass('ng-valid');
          done();
        })
        .catch(done);
      });
    });

    describe('invalid querystring', function () {
      var mockValidateReturns = invalidEsResponse();

      beforeEach(function () {
        init();
        mockValidateQuery.returns(mockValidateReturns);
        compile();
      });

      it('should set invalid state', function (done) {
        var checkInvalid = function () {
          checkClass('ng-invalid');
          done();
        };

        // give angular time to set up the directive
        mockValidateReturns
        // swallow the mockReturn rejected response
        .then(checkInvalid, checkInvalid)
        .catch(done);
      });
    });
  });
});
