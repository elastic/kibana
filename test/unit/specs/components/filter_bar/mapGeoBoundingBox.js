define(function (require) {
  describe('Filter Bar Directive', function () {
    describe('mapGeoBoundingBox()', function () {
      var sinon = require('test_utils/auto_release_sinon');
      var mapGeoBoundingBox, $rootScope, indexPattern, getIndexPatternStub;
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
        mapGeoBoundingBox = Private(require('components/filter_bar/lib/mapGeoBoundingBox'));
        $rootScope = _$rootScope_;
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        getIndexPatternStub.returns(Promise.resolve(indexPattern));
      }));

      it('should return the key and value for matching filters with bounds', function (done) {
        var filter = {
          meta: {
            index: 'logstash-*'
          },
          geo_bounding_box: {
            point: { // field name
              top_left: {
                lat: 5,
                lon: 10
              },
              bottom_right: {
                lat: 15,
                lon: 20
              }
            }
          }
        };
        mapGeoBoundingBox(filter).then(function (result) {
          expect(result).to.have.property('key', 'point');
          expect(result).to.have.property('value');
          // remove html entities and non-alphanumerics to get the gist of the value
          expect(result.value.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).to.be('lat5lon10tolat15lon20');
          done();
        });
        $rootScope.$apply();
      });

      it('should return undefined for none matching', function (done) {
        var filter = { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } };
        mapGeoBoundingBox(filter).catch(function (result) {
          expect(result).to.be(filter);
          done();
        });
        $rootScope.$apply();
      });

    });
  });
});
