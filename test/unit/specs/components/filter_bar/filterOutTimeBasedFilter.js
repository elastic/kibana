/* global sinon */
define(function (require) {
  describe('Filter Bar Directive', function () {
    describe('filterOutTimeBasedFilter()', function () {

			var filterOutTimeBasedFilter,
          $rootScope,
          indexPattern,
          getIndexPatternStub;

      beforeEach(module('kibana'));

      beforeEach(function () {
        getIndexPatternStub = sinon.stub();
        module('kibana/courier', function ($provide) {
          $provide.service('courier', function () {
            var courier = { indexPatterns: { get: getIndexPatternStub } };
            return courier;
          });
        });
      });

			beforeEach(inject(function (Private, _$rootScope_, Promise) {
        filterOutTimeBasedFilter = Private(require('components/filter_bar/lib/filterOutTimeBasedFilter'));
				$rootScope = _$rootScope_;
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        getIndexPatternStub.returns(Promise.resolve(indexPattern));
			}));

      it('should return the matching filter for the defualt time field', function (done) {
        var filters = [
          { meta: { index: 'logstash-*' }, query: { match: { _type:  { query: 'apache', type: 'phrase' } } } },
          { meta: { index: 'logstash-*' }, range: { 'time': { gt: 1388559600000, lt: 1388646000000 } } }
        ];
        filterOutTimeBasedFilter(filters).then(function (results) {
          expect(results).to.have.length(1);
          expect(results).to.not.contain(filters[1]);
          done();
        });
        $rootScope.$apply();
      });

    });
  });
});
