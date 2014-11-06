define(function (require) {
  return function AggParamWriterHelper(Private) {
    var _ = require('lodash');
    var Vis = Private(require('components/vis/vis'));
    var aggTypes = Private(require('components/agg_types/index'));
    var visTypes = Private(require('registry/vis_types'));
    var stubbedLogstashIndexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));

    /**
     * Helper object for writing aggParams. Specify an aggType and it will find a vis & schema, and
     * wire up the supporting objects required to feed in parameters, and get #write() output.
     *
     * Use cases:
     *  - Verify that the interval parameter of the histogram visualization casts its input to a number
     *    ```js
     *    it('casts to a number', function () {
     *      var writer = new AggParamWriter({ aggType: 'histogram' });
     *      var output = writer.write({ interval : '100/10' });
     *      expect(output.params.interval).to.be.a('number');
     *      expect(output.params.interval).to.be(100);
     *    });
     *    ```
     *
     * @class AggParamWriter
     * @param {object} opts - describe the properties of this paramWriter
     * @param {string} opts.aggType - the name of the aggType we want to test. ('histogram', 'filter', etc.)
     */
    function AggParamWriter(opts) {
      var self = this;

      self.aggType = opts.aggType;
      if (_.isString(self.aggType)) {
        self.aggType = aggTypes.byName[self.aggType];
      }

      // not configurable right now, but totally required
      self.indexPattern = stubbedLogstashIndexPattern;

      // the vis type we will use to write the aggParams
      self.visType = null;

      // the schema that the aggType satisfies
      self.visAggSchema = null;

      // find a suitable vis type and schema
      _.find(visTypes, function (visType) {
        var schema = _.find(visType.schemas.all, function (schema) {
          // type, type, type, type, type... :(
          return schema.group === self.aggType.type;
        });

        if (schema) {
          self.visType = visType;
          self.visAggSchema = schema;
          return true;
        }
      });

      if (!self.aggType || !self.visType || !self.visAggSchema) {
        throw new Error('unable to find a usable visType and schema for the ' + opts.aggType + ' agg type');
      }

      self.vis = new Vis(self.indexPattern, {
        type: self.visType
      });
    }

    AggParamWriter.prototype.write = function (paramValues) {
      var self = this;
      paramValues = _.clone(paramValues);

      if (self.aggType.params.byName.field && !paramValues.field) {
        // pick a field rather than force a field to be specified everywhere
        if (self.aggType.type === 'metrics') {
          paramValues.field = _.sample(self.indexPattern.fields.byType.number);
        } else {
          paramValues.field = _.sample(self.indexPattern.fields.byType.string);
        }
      }

      self.vis.setState({
        type: self.vis.type.name,
        aggs: [{
          type: self.aggType,
          schema: self.visAggSchema,
          params: paramValues
        }]
      });

      var aggConfig = _.find(self.vis.aggs, function (aggConfig) {
        return aggConfig.type === self.aggType;
      });

      return aggConfig.type.params.write(aggConfig);
    };

    return AggParamWriter;

  };
});