define(function (require) {
  describe('buildHierarchicalData()', function () {
    describe('transformAggregation()', function () {

      var transform;
      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        transform = Private(require('components/agg_response/hierarchical/_transform_aggregation'));
      }));

      var fixture = {};
      fixture.agg = { id: 'agg_2', name: 'test', schema: { group: 'buckets' }, getKey: function () {},
        _next: { id: 'agg_3', name: 'example', schema: { group: 'buckets' }, getKey: function () {} } };
      fixture.metric = { id: 'agg_1' };
      fixture.aggData = {
        buckets: [
          { key: 'foo', doc_count: 2, agg_3: { buckets: [ { key: 'win', doc_count: 1 }, { key: 'mac', doc_count: 1 }]}},
          { key: 'bar', doc_count: 4, agg_3: {  buckets: [ { key: 'win', doc_count: 2 }, { key: 'mac', doc_count: 2 }]}}
        ]
      };

      it('should return an array of objects with the doc_count as the size if the metric does not exist', function () {
        var agg = { id: 'agg_2', name: 'test', schema: { group: 'buckets' }, getKey: function () {}};
        var aggData = {
          buckets: [
            { key: 'foo', doc_count: 1 },
            { key: 'bar', doc_count: 2 }
          ]
        };

        var children = transform(agg, fixture.metric, aggData);
        expect(children).to.be.an(Array);
        expect(children).to.have.length(2);
        expect(children[0]).to.have.property('size', 1);
        expect(children[1]).to.have.property('size', 2);
      });

      it('should return an array of objects with the metric agg value as the size', function () {
        var agg = { id: 'agg_2', name: 'test', schema: { group: 'buckets' }, getKey: function () {} };
        var aggData = {
          buckets: [
            { key: 'foo', doc_count: 1, agg_1: { value: 0 } },
            { key: 'bar', doc_count: 2, agg_1: { value: 4 } }
          ]
        };

        var children = transform(agg, fixture.metric, aggData);
        expect(children).to.be.an(Array);
        expect(children).to.have.length(2);
        expect(children[0]).to.have.property('size', 0);
        expect(children[1]).to.have.property('size', 4);
      });

      it('should create two levels of metrics', function () {
        var children = transform(fixture.agg, fixture.metric, fixture.aggData);
        expect(children).to.be.an(Array);
        expect(children).to.have.length(2);
        expect(children[0]).to.have.property('children');
        expect(children[1]).to.have.property('children');
        expect(children[0]).to.have.property('aggConfig', fixture.agg);
        expect(children[1]).to.have.property('aggConfig', fixture.agg);
        expect(children[0].children).to.have.length(2);
        expect(children[1].children).to.have.length(2);
        expect(children[0]).to.have.property('name', 'foo');
        expect(children[0]).to.have.property('size', 2);
        expect(children[1]).to.have.property('name', 'bar');
        expect(children[1]).to.have.property('size', 4);
        expect(children[0].children[0]).to.have.property('size', 1);
        expect(children[0].children[0]).to.have.property('aggConfig', fixture.agg.agg_3);
        expect(children[0].children[0]).to.have.property('name', 'win');
        expect(children[0].children[1]).to.have.property('size', 1);
        expect(children[0].children[1]).to.have.property('parent', children[0]);
        expect(children[0].children[1]).to.have.property('aggConfig', fixture.agg.agg_3);
        expect(children[0].children[1]).to.have.property('name', 'mac');
        expect(children[1].children[0]).to.have.property('size', 2);
        expect(children[0].children[1]).to.have.property('parent', children[0]);
        expect(children[1].children[0]).to.have.property('aggConfig', fixture.agg.agg_3);
        expect(children[1].children[0]).to.have.property('name', 'win');
        expect(children[1].children[1]).to.have.property('size', 2);
        expect(children[1].children[1]).to.have.property('parent', children[1]);
        expect(children[1].children[1]).to.have.property('aggConfig', fixture.agg.agg_3);
        expect(children[1].children[1]).to.have.property('name', 'mac');
        expect(children[1].children[1]).to.have.property('parent', children[1]);
      });

    });
  });
});
