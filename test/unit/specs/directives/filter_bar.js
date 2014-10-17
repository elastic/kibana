define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var sinon = require('sinon/sinon');
  var $ = require('jquery');

  var toggleFilter = require('components/filter_bar/lib/toggleFilter');
  var toggleAll = require('components/filter_bar/lib/toggleAll');

  var mapFilter = require('components/filter_bar/lib/mapFilter');
  var removeFilter = require('components/filter_bar/lib/removeFilter');
  var removeAll = require('components/filter_bar/lib/removeAll');

  require('components/filter_bar/filter_bar');

  describe('Filter Bar Directive', function () {

    var $rootScope, $compile;

    beforeEach(function (done) {
      // load the application
      module('kibana');

      inject(function (_$rootScope_, _$compile_) {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        $rootScope.state = {
          filters: [
            { query: { match: { '@tags': { query: 'test' } } } },
            { query: { match: { '@tags': { query: 'bar' } } } },
            { exists: { field: '@timestamp' } },
            { missing: { field: 'host' }, disabled: true },
          ]
        };
        done();
      });
    });

    it('should render all the filters in state', function () {
      var el = $compile('<filter-bar state=state></filter-bar>')($rootScope);
      $rootScope.$digest();
      var filters = el.find('.filter');
      expect(filters).to.have.length(4);
      expect($(filters[0]).find('span')[0].innerHTML).to.equal('@tags:');
      expect($(filters[0]).find('span')[1].innerHTML).to.equal('"test"');
      expect($(filters[1]).find('span')[0].innerHTML).to.equal('@tags:');
      expect($(filters[1]).find('span')[1].innerHTML).to.equal('"bar"');
      expect($(filters[2]).find('span')[0].innerHTML).to.equal('exists:');
      expect($(filters[2]).find('span')[1].innerHTML).to.equal('"@timestamp"');
      expect($(filters[3]).find('span')[0].innerHTML).to.equal('missing:');
      expect($(filters[3]).find('span')[1].innerHTML).to.equal('"host"');
    });

    describe('functions', function () {

      describe('mapFilter', function () {
        it('should map query filters', function () {
          var before = { query: { match: { '@tags': { query: 'test' } } } };
          var after = mapFilter(before);
          expect(after).to.have.property('key', '@tags');
          expect(after).to.have.property('value', 'test');
          expect(after).to.have.property('disabled', false);
          expect(after).to.have.property('negate', false);
          expect(after).to.have.property('filter', before);
        });

        it('should map exists filters', function () {
          var before = { exists: { field: '@timestamp' } };
          var after = mapFilter(before);
          expect(after).to.have.property('key', 'exists');
          expect(after).to.have.property('value', '@timestamp');
          expect(after).to.have.property('disabled', false);
          expect(after).to.have.property('negate', false);
          expect(after).to.have.property('filter', before);
        });

        it('should map missing filters', function () {
          var before = { missing: { field: '@timestamp' } };
          var after = mapFilter(before);
          expect(after).to.have.property('key', 'missing');
          expect(after).to.have.property('value', '@timestamp');
          expect(after).to.have.property('disabled', false);
          expect(after).to.have.property('negate', false);
          expect(after).to.have.property('filter', before);
        });

      });

      describe('toggleFilter', function () {
        it('should toggle filters on and off', function () {
          var filter = $rootScope.state.filters[0];
          var fn = toggleFilter($rootScope);
          fn(mapFilter(filter));
          expect(filter).to.have.property('disabled', true);
        });
      });

      describe('removeFilter', function () {
        it('should remove the filter from the state', function () {
          var filter = $rootScope.state.filters[2];
          var fn = removeFilter($rootScope);
          fn(filter);
          expect($rootScope.state.filters).to.not.contain(filter);
        });
      });

      describe('removeAll', function () {
        it('should remove all the filters', function () {
          var fn = removeAll($rootScope);
          expect($rootScope.state.filters).to.have.length(4);
          fn();
          expect($rootScope.state.filters).to.have.length(0);
        });
      });

      describe('toggleAll', function () {
        var fn;

        beforeEach(function () {
          // This would normally be done by the directive
          $rootScope.filters = _($rootScope.state.filters)
            .filter(function (filter) {
              return filter;
            })
            .flatten(true)
            .map(mapFilter)
            .value();

          fn = toggleAll($rootScope);
        });

        it('should toggle all the filters', function () {
          expect(_.filter($rootScope.state.filters, 'disabled')).to.have.length(1);
          fn();
          expect(_.filter($rootScope.state.filters, 'disabled')).to.have.length(3);
        });

        it('should disable all the filters', function () {
          expect(_.filter($rootScope.state.filters, 'disabled')).to.have.length(1);
          fn(true);
          expect(_.filter($rootScope.state.filters, 'disabled')).to.have.length(4);
        });

        it('should enable all the filters', function () {
          expect(_.filter($rootScope.state.filters, 'disabled')).to.have.length(1);
          fn(false);
          expect(_.filter($rootScope.state.filters, 'disabled')).to.have.length(0);
        });
      });

    });
  });
});
