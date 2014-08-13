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

  var markup = '<div class="typeahead" kbn-typeahead="' + typeaheadName + '">' +
    '<input type="text" placeholder="Filter..." class="form-control" ng-model="query" kbn-typeahead-input>' +
    '<kbn-typeahead-items></kbn-typeahead-items>' +
    '</div>';
  var typeaheadItems = ['abc', 'def', 'ghi'];

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
        PersistedLogMock.prototype.get = sinon.stub().returns(typeaheadItems);

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

      $elem = angular.element(markup);

      PersistedLog = $injector.get('PersistedLog');

      $compile($elem)($parentScope);
      $elem.scope().$digest();
      $typeaheadScope = $elem.isolateScope();
      typeaheadCtrl = $elem.controller('kbnTypeahead');
    });
  };

  describe.only('typeahead directive', function () {
    describe('typeahead requirements', function () {
      describe('missing input', function () {
        var goodMarkup = markup;

        before(function () {
          markup = '<div class="typeahead" kbn-typeahead="' + typeaheadName + '">' +
            '<kbn-typeahead-items></kbn-typeahead-items>' +
            '</div>';
        });

        after(function () {
          markup = goodMarkup;
        });

        it('should throw with message', function () {
          expect(init).to.throwException(/kbn-typeahead-input must be defined/);
        });
      });
    });

    describe('internal functionality', function () {
      beforeEach(function () {
        init();
      });

      describe('PersistedLog', function () {
        it('should instantiate PersistedLog', function () {
          expect(typeaheadCtrl.history.name).to.equal('typeahead:' + typeaheadName);
          expect(typeaheadCtrl.history.options.maxLength).to.equal(typeaheadHistoryCount);
          expect(typeaheadCtrl.history.options.filterDuplicates).to.equal(true);
        });

        it('should read data when directive is instantiated', function () {
          expect(typeaheadCtrl.history.get.callCount).to.be(1);
        });

        it('should not save empty entries', function () {
          var entries = typeaheadItems.slice(0);
          entries.push('', 'jkl');
          for (var i = 0; i < entries.length; i++) {
            $typeaheadScope.inputModel.$setViewValue(entries[i]);
            typeaheadCtrl.persistEntry();
          }
          expect(typeaheadCtrl.history.add.callCount).to.be(4);
        });

      });

      describe('controller scope', function () {
        it('should contain the input model', function () {
          expect($typeaheadScope.inputModel).to.be.an('object');
          expect($typeaheadScope.inputModel).to.have.keys(['$viewValue', '$modelValue', '$setViewValue']);
        });

        it('should save data to the scope', function () {
          // $scope.items is set via history.add, so mock the output
          typeaheadCtrl.history.add.returns(typeaheadItems);

          // a single call will call history.add, which will respond with the mocked data
          $typeaheadScope.inputModel.$setViewValue(typeaheadItems[0]);
          typeaheadCtrl.persistEntry();

          expect($typeaheadScope.items).to.be.an('array');
          expect($typeaheadScope.items.length).to.be(typeaheadItems.length);
        });
      });
    });
  });
});
