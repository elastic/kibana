define(function (require) {
  var mapMissing = require('components/filter_bar/lib/mapMissing');
  describe('Filter Bar Directive', function () {
    describe('mapMissing()', function () {

			var mapMissing, $rootScope;
			beforeEach(module('kibana'));
			beforeEach(inject(function (Private, _$rootScope_) {
				$rootScope = _$rootScope_;
				mapMissing = Private(require('components/filter_bar/lib/mapMissing'));
			}));

      it('should return the key and value for matching filters', function (done) {
        var filter = { missing: { field: '_type' } };
				mapMissing(filter).then(function (result) {
					expect(result).to.have.property('key', 'missing');
					expect(result).to.have.property('value', '_type');
					done();
				});
				$rootScope.$apply();
      });

      it('should return undefined for none matching', function (done) {
        var filter = { query: { match: { query: 'foo' } } };
				mapMissing(filter).catch(function (result) {
					expect(result).to.be(filter);
					done();
				});
				$rootScope.$apply();
      });

    });
  });
});
