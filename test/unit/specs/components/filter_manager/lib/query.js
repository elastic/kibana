define(function (require) {
  var fn = require('components/filter_manager/lib/query');
  var _ = require('lodash');
  var indexPattern, expected;
  describe('Filter Manager', function () {
    describe('Phrase filter builder', function () {
      beforeEach(module('kibana'));
      beforeEach(inject(function (Private, _$rootScope_, Promise) {
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        expected = _.cloneDeep(require('fixtures/filter_skeleton'));
      }));

      it('should be a function', function () {
        expect(fn).to.be.a(Function);
      });

      it('should return a query filter when passed a standard field', function () {
        expected.query = {
          foo: 'bar'
        };
        expect(fn({foo: 'bar'}, indexPattern.id)).to.eql(expected);
      });

    });
  });
});

