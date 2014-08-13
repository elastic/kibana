define(function (require) {
  var angular = require('angular');
  var sinon = require('sinon/sinon');

  // Load the kibana app dependencies.
  require('angular-route');

  // Load kibana and its applications
  require('index');
  require('components/typeahead/typeahead');

  // TODO: This should not be needed, timefilter is only included here, it should move
  require('apps/discover/index');

  var typeaheadHistoryCount = 10;
  var typeaheadName = 'unittest';
  var $parentScope;
  var $typeaheadScope, $elem;
  var $typeaheadInputScope;
  var typeaheadCtrl, PersistedLog;

  var init = function () {
    // Load the application
    module('kibana');

    module('kibana/typeahead', function ($provide) {
      $provide.factory('PersistedLog', function () {
        function PersistedLogMock(name, options) {
          this.name = name;
          this.options = options;
        }

        PersistedLogMock.prototype.add = sinon.stub();
        PersistedLogMock.prototype.get = sinon.stub();

        return PersistedLogMock;
      });

      $provide.service('config', function () {
        this.get = sinon.stub().returns(typeaheadHistoryCount);
      });
    });


    // Create the scope
    inject(function ($injector, $controller, $rootScope, $compile) {
      // Give us a scope
      $parentScope = $rootScope;

      $elem = angular.element(
        '<div class="typeahead" kbn-typeahead="' + typeaheadName + '">' +
        '<input type="text" placeholder="Filter..." class="form-control" ng-model="query" kbn-typeahead-input>' +
        '<kbn-typeahead-items></kbn-typeahead-items>'
      );

      PersistedLog = $injector.get('PersistedLog');

      $compile($elem)($parentScope);
      $elem.scope().$digest();
      $typeaheadScope = $elem.isolateScope();
      typeaheadCtrl = $elem.controller('kbnTypeahead');
    });
  };

  describe('typeahead directive', function () {
    beforeEach(function () {
      init();
    });

    describe('Persisted history', function () {
      it('should instantiate PersistedLog', function () {
        expect(typeaheadCtrl.history.name).to.equal('typeahead:' + typeaheadName);
        expect(typeaheadCtrl.history.options.maxLength).to.equal(typeaheadHistoryCount);
        expect(typeaheadCtrl.history.options.filterDuplicates).to.equal(true);
      });
    });

    describe('controller scope', function () {
      it('should contain the input', function () {
        expect($typeaheadScope.inputModel).to.be.an('object');
      });
    });
  });
});
