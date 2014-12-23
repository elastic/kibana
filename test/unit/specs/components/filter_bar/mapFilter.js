/* global sinon */
define(function (require) {

  describe('Filter Bar Directive', function () {

		var mapFilter, $rootScope, indexPattern, getIndexPatternStub;

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

		beforeEach(inject(function (Promise, _$rootScope_, Private) {
			mapFilter = Private(require('components/filter_bar/lib/mapFilter'));
			$rootScope = _$rootScope_;
      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      getIndexPatternStub.returns(Promise.resolve(indexPattern));
		}));

    describe('mapFilter()', function () {
      it('should map query filters', function (done) {
        var before = { meta: { index: 'logstash-*' }, query: { match: { '_type': { query: 'apache' } } } };
				mapFilter(before).then(function (after) {
          expect(after).to.have.property('meta');
					expect(after.meta).to.have.property('key', '_type');
					expect(after.meta).to.have.property('value', 'apache');
					expect(after.meta).to.have.property('disabled', false);
					expect(after.meta).to.have.property('negate', false);
					done();
				});
				$rootScope.$apply();
      });

      it('should map exists filters', function (done) {
        var before = { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } };
				mapFilter(before).then(function (after) {
          expect(after).to.have.property('meta');
					expect(after.meta).to.have.property('key', 'exists');
					expect(after.meta).to.have.property('value', '@timestamp');
					expect(after.meta).to.have.property('disabled', false);
					expect(after.meta).to.have.property('negate', false);
					done();
				});
				$rootScope.$apply();
      });

      it('should map missing filters', function (done) {
        var before = { meta: { index: 'logstash-*' }, missing: { field: '@timestamp' } };
				mapFilter(before).then(function (after) {
          expect(after).to.have.property('meta');
					expect(after.meta).to.have.property('key', 'missing');
					expect(after.meta).to.have.property('value', '@timestamp');
					expect(after.meta).to.have.property('disabled', false);
					expect(after.meta).to.have.property('negate', false);
					done();
				});
				$rootScope.$apply();
      });

      it('should map json filter', function (done) {
        var before = { meta: { index: 'logstash-*' }, query: { match_all: {} } };
				mapFilter(before).then(function (after) {
          expect(after).to.have.property('meta');
					expect(after.meta).to.have.property('key', 'query');
					expect(after.meta).to.have.property('value', '{"match_all":{}}');
					expect(after.meta).to.have.property('disabled', false);
					expect(after.meta).to.have.property('negate', false);
					done();
				});
				$rootScope.$apply();
      });

      it('should finish with a catch', function (done) {
        var before = { meta: { index: 'logstash-*' }, foo: '' };
				mapFilter(before).catch(function (error) {
          expect(error).to.be.an(Error);
          expect(error.message).to.be('No mappings have been found for filter.');
					done();
				});
				$rootScope.$apply();
      });

    });

  });
});
