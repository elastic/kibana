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

  var mockValidateQuery;
  var mockValidateReturns;
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
    inject(function ($injector, $rootScope, $compile) {
      // Give us a scope
      $parentScope = $rootScope;
      $parentScope.mockModel = mockScope.ngModel;
      $parentScope.mockQueryInput = mockScope.queryInput;

      var es = $injector.get('es');
      mockValidateQuery = sinon.stub(es.indices, 'validateQuery');
      mockValidateQuery.returns(mockValidateReturns);

      $elem = angular.element(markup);
      $compile($elem)($parentScope);
      $elemScope = $elem.isolateScope();
    });
  };

  describe('validate-query directive', function () {
    describe('initialization', function () {
      beforeEach(function () {
        mockValidateReturns = validEsResponse();
        init();
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
      beforeEach(function () {
        mockValidateReturns = validEsResponse();
        init();
      });

      it('should set valid state', function () {
        // give angular time to set up the directive
        mockValidateReturns.then(function () {
          checkClass('ng-valid-query-input');
          checkClass('ng-valid');
        });
      });

      it('should change validity based on response', function (done) {
        Promise.resolve()
        .then(function () {
          checkClass('ng-valid');
          mockValidateQuery.returns(invalidEsResponse());
          $parentScope.mockModel = 'invalid:';
          $elem.scope().$digest();
        })
        .delay(debounceDelay + 1)
        .then(function () {
          checkClass('ng-invalid');
          mockValidateQuery.returns(validEsResponse());
          $parentScope.mockModel = 'valid';
          $elem.scope().$digest();
        })
        .delay(debounceDelay + 1)
        .then(function () {
          checkClass('ng-valid');
          done();
        });
      });
    });

    describe('invalid querystring', function () {
      beforeEach(function () {
        mockValidateReturns = invalidEsResponse();
        init();
      });

      it('should set invalid state', function () {
        // give angular time to set up the directive
        mockValidateReturns.then(function () {
          checkClass('ng-invalid');
        });
      });
    });
  });
});
