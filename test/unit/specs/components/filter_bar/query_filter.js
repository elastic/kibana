define(function (require) {
  var _ = require('lodash');
  var queryFilter;
  var EventEmitter;
  var $rootScope;

  describe('Query Filter', function () {
    describe('Module', function () {
      beforeEach(module('kibana'));

      beforeEach(function () {
        inject(function (_$rootScope_, Private) {
          $rootScope = _$rootScope_;
          queryFilter = Private(require('components/filter_bar/query_filter'));
          EventEmitter = Private(require('factories/events'));
        });
      });

      describe('module instance', function () {
        it('should be an event emitter', function () {
          expect(queryFilter).to.be.an(EventEmitter);
        });
      });

      describe('module methods', function () {
        it('should have methods for getting filters', function () {
          expect(queryFilter.getFilters).to.be.a('function');
          expect(queryFilter.getAppFilters).to.be.a('function');
          expect(queryFilter.getGlobalFilters).to.be.a('function');
        });

        it('should have methods for modifying filters', function () {
          expect(queryFilter.addFilters).to.be.a('function');
          expect(queryFilter.toggleFilter).to.be.a('function');
          expect(queryFilter.toggleAll).to.be.a('function');
          expect(queryFilter.removeFilter).to.be.a('function');
          expect(queryFilter.removeAll).to.be.a('function');
          expect(queryFilter.invertFilter).to.be.a('function');
          expect(queryFilter.invertAll).to.be.a('function');
          expect(queryFilter.pinFilter).to.be.a('function');
          expect(queryFilter.pinAll).to.be.a('function');
        });
      });
    });

    describe('Actions', function () {
      var childSuites = [
        require('specs/components/filter_bar/_getFilters'),
        require('specs/components/filter_bar/_addFilters'),
        require('specs/components/filter_bar/_removeFilters'),
        require('specs/components/filter_bar/_toggleFilters'),
        require('specs/components/filter_bar/_invertFilters'),
        require('specs/components/filter_bar/_pinFilters'),
      ].forEach(function (s) {
        describe(s[0], s[1]);
      });
    });
  });
});
