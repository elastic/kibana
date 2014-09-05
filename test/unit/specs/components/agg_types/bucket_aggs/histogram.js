define(function (require) {
  return ['Histogram Agg', function () {
    var _ = require('lodash');

    describe('ordered', function () {
      var histogram;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        histogram = Private(require('components/agg_types/index')).byName.histogram;
      }));

      it('is ordered', function () {
        expect(histogram.ordered).to.be.ok();
      });

      it('is not ordered by date', function () {
        expect(histogram.ordered).to.not.have.property('date');
      });
    });


    describe('params', function () {
      var paramWriter;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        var AggParamWriter = Private(require('test_utils/agg_param_writer'));
        paramWriter = new AggParamWriter({ aggType: 'histogram' });
      }));

      describe('interval', function () {
        // reads aggConfig.params.interval, writes to dsl.interval

        it('accepts a number', function () {
          var output = paramWriter.write({ interval: 100 });
          expect(output.params).to.have.property('interval', 100);
        });

        it('accepts a string', function () {
          var output = paramWriter.write({ interval: '10' });
          expect(output.params).to.have.property('interval', 10);
        });

        it('fails on non-numeric values', function () {
          // template validation prevents this from users, not devs
          var output = paramWriter.write({ interval: [] });
          expect(isNaN(output.params.interval)).to.be.ok();
        });
      });

      describe('min_doc_count', function () {
        it('casts true values to 0', function () {
          var output = paramWriter.write({ min_doc_count: true });
          expect(output.params).to.have.property('min_doc_count', 0);

          output = paramWriter.write({ min_doc_count: 'yes' });
          expect(output.params).to.have.property('min_doc_count', 0);

          output = paramWriter.write({ min_doc_count: 1 });
          expect(output.params).to.have.property('min_doc_count', 0);

          output = paramWriter.write({ min_doc_count: {} });
          expect(output.params).to.have.property('min_doc_count', 0);
        });

        it('writes nothing for false values', function () {
          var output = paramWriter.write({ min_doc_count: '' });
          expect(output.params).to.not.have.property('min_doc_count');

          output = paramWriter.write({ min_doc_count: null });
          expect(output.params).to.not.have.property('min_doc_count');

          output = paramWriter.write({ min_doc_count: undefined });
          expect(output.params).to.not.have.property('min_doc_count');
        });
      });

      describe('extended_bounds', function () {
        it('writes when only eb.min is set', function () {
          var output = paramWriter.write({
            extended_bounds: { min: 0 }
          });
          expect(output.params.extended_bounds).to.have.property('min', 0);
          expect(output.params.extended_bounds).to.have.property('max', undefined);
        });

        it('writes when only eb.max is set', function () {
          var output = paramWriter.write({
            extended_bounds: { max: 0 }
          });
          expect(output.params.extended_bounds).to.have.property('min', undefined);
          expect(output.params.extended_bounds).to.have.property('max', 0);
        });

        it('writes when both eb.min and eb.max are set', function () {
          var output = paramWriter.write({
            extended_bounds: { min: 99, max: 100 }
          });
          expect(output.params.extended_bounds).to.have.property('min', 99);
          expect(output.params.extended_bounds).to.have.property('max', 100);
        });

        it('does not write when nothing is set', function () {
          var output = paramWriter.write({
            extended_bounds: {}
          });
          expect(output.params).to.not.have.property('extended_bounds');
        });
      });
    });
  }];
});