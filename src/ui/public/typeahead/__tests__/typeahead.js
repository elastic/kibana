import angular from 'angular';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/typeahead';
import 'plugins/kibana/discover/index';

// TODO: This should not be needed, timefilter is only included here, it should move

const typeaheadHistoryCount = 10;
const typeaheadName = 'unittest';
let $parentScope;
let $typeaheadScope;
let $elem;
let typeaheadCtrl;
let onSelectStub;

let markup = `<div class="typeahead" kbn-typeahead="${typeaheadName}" on-select="selectItem()">
                <input type="text" placeholder="Filter..." class="form-control" ng-model="query" kbn-typeahead-input>
                <kbn-typeahead-items></kbn-typeahead-items>
              </div>`;
const typeaheadItems = ['abc', 'def', 'ghi'];

const init = function () {
  // Load the application
  ngMock.module('kibana');

  ngMock.module('kibana/typeahead', function ($provide) {
    $provide.factory('PersistedLog', function () {
      function PersistedLogMock(name, options) {
        this.name = name;
        this.options = options;
      }

      PersistedLogMock.prototype.add = sinon.stub().returns(typeaheadItems);
      PersistedLogMock.prototype.get = sinon.stub().returns(typeaheadItems);

      return PersistedLogMock;
    });

    $provide.service('config', function () {
      this.get = sinon.stub().returns(typeaheadHistoryCount);
    });
  });


  // Create the scope
  ngMock.inject(function ($injector, $controller, $rootScope, $compile) {
    // Give us a scope
    $parentScope = $rootScope;

    $parentScope.selectItem = onSelectStub = sinon.stub();
    $elem = angular.element(markup);

    $compile($elem)($parentScope);
    $elem.scope().$digest();
    $typeaheadScope = $elem.isolateScope();
    typeaheadCtrl = $elem.controller('kbnTypeahead');
  });
};

describe('typeahead directive', function () {
  describe('typeahead requirements', function () {
    describe('missing input', function () {
      const goodMarkup = markup;

      before(function () {
        markup = `<div class="typeahead" kbn-typeahead="${typeaheadName}" on-select="selectItem()">
                    <kbn-typeahead-items></kbn-typeahead-items>
                  </div>`;
      });

      after(function () {
        markup = goodMarkup;
      });

      it('should throw with message', function () {
        expect(init).to.throwException(/kbn-typeahead-input must be defined/);
      });
    });

    describe('missing on-select attribute', function () {
      const goodMarkup = markup;

      before(function () {
        markup = `<div class="typeahead" kbn-typeahead="${typeaheadName}">
                    <input type="text" placeholder="Filter..." class="form-control" ng-model="query" kbn-typeahead-input />
                    <kbn-typeahead-items></kbn-typeahead-items>
                  </div>`;
      });

      after(function () {
        markup = goodMarkup;
      });

      it('should throw with message', function () {
        expect(init).to.throwException(/on-select must be defined/);
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
        const entries = typeaheadItems.slice(0);
        entries.push('', 'jkl');
        for (let i = 0; i < entries.length; i++) {
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

      it('should order filtered results', function () {
        const entries = ['ac/dc', 'anthrax', 'abba', 'phantogram', 'skrillex'];
        const allEntries = typeaheadItems.concat(entries);
        const startMatches = allEntries.filter(function (item) {
          return /^a/.test(item);
        });
        typeaheadCtrl.history.add.returns(allEntries);

        for (let i = 0; i < entries.length; i++) {
          $typeaheadScope.inputModel.$setViewValue(entries[i]);
          typeaheadCtrl.persistEntry();
        }

        typeaheadCtrl.filterItemsByQuery('a');

        expect($typeaheadScope.filteredItems).to.contain('phantogram');
        const nonStarterIndex = $typeaheadScope.filteredItems.indexOf('phantogram');

        startMatches.forEach(function (item) {
          expect($typeaheadScope.filteredItems).to.contain(item);
          expect($typeaheadScope.filteredItems.indexOf(item)).to.be.below(nonStarterIndex);
        });

        expect($typeaheadScope.filteredItems).not.to.contain('skrillex');
      });

      it('should call the on-select method on mouse click of an item', function () {
        // $scope.items is set via history.add, so mock the output
        typeaheadCtrl.history.add.returns(typeaheadItems);

        // a single call will call history.add, which will respond with the mocked data
        $typeaheadScope.inputModel.$setViewValue(typeaheadItems[0]);
        typeaheadCtrl.persistEntry();

        $parentScope.$digest();

        $elem.find('.typeahead-item').click();
        sinon.assert.called(onSelectStub);
      });
    });

    describe('list appearance', function () {
      beforeEach(function () {
        typeaheadCtrl.history.add.returns(typeaheadItems);
        $typeaheadScope.inputModel.$setViewValue(typeaheadItems[0]);
        typeaheadCtrl.persistEntry();

        // make sure the data looks how we expect
        expect($typeaheadScope.items.length).to.be(3);
      });

      it('should default to hidden', function () {
        expect(typeaheadCtrl.isVisible()).to.be(false);
      });

      it('should appear when not hidden, has matches input and focused', function () {
        typeaheadCtrl.setHidden(false);
        expect(typeaheadCtrl.isVisible()).to.be(false);

        typeaheadCtrl.filterItemsByQuery(typeaheadItems[0]);
        expect(typeaheadCtrl.isVisible()).to.be(false);

        // only visible when all conditions match
        typeaheadCtrl.setFocused(true);
        expect(typeaheadCtrl.isVisible()).to.be(true);

        typeaheadCtrl.setFocused(false);
        expect(typeaheadCtrl.isVisible()).to.be(false);
      });

      it('should appear when not hidden, has matches input and moused over', function () {
        typeaheadCtrl.setHidden(false);
        expect(typeaheadCtrl.isVisible()).to.be(false);

        typeaheadCtrl.filterItemsByQuery(typeaheadItems[0]);
        expect(typeaheadCtrl.isVisible()).to.be(false);

        // only visible when all conditions match
        typeaheadCtrl.setMouseover(true);
        expect(typeaheadCtrl.isVisible()).to.be(true);

        typeaheadCtrl.setMouseover(false);
        expect(typeaheadCtrl.isVisible()).to.be(false);
      });

      it('should hide when no matches', function () {
        typeaheadCtrl.setHidden(false);
        typeaheadCtrl.setFocused(true);

        typeaheadCtrl.filterItemsByQuery(typeaheadItems[0]);
        expect(typeaheadCtrl.isVisible()).to.be(true);

        typeaheadCtrl.filterItemsByQuery('a8h4o8ah48thal4i7rlia4ujru4glia47gf');
        expect(typeaheadCtrl.isVisible()).to.be(false);
      });
    });
  });
});
