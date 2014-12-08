define(function (require) {
  return ['renderbot#buildChartData', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');

    var VislibRenderbot;
    var buildChartData;
    var aggResponse;
    var TableGroup;
    var Table;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      Table = Private(require('components/agg_response/tabify/_table'));
      TableGroup = Private(require('components/agg_response/tabify/_table_group'));
      aggResponse = Private(require('components/agg_response/index'));
      VislibRenderbot = Private(require('plugins/vis_types/vislib/_vislib_renderbot'));
      buildChartData = Private(require('plugins/vis_types/vislib/_build_chart_data'));
    }));

    describe('for hierarchical vis', function () {
      it('defers to hierarchical aggResponse converter', function () {
        var football = {};
        var renderbot = {
          vis: {
            isHierarchical: _.constant(true)
          }
        };

        var stub = sinon.stub(aggResponse, 'hierarchical').returns(football);
        expect(buildChartData.call(renderbot, football)).to.be(football);
        expect(stub).to.have.property('callCount', 1);
        expect(stub.firstCall.args[0]).to.be(renderbot.vis);
        expect(stub.firstCall.args[1]).to.be(football);
      });
    });

    describe('for point plot', function () {
      it('calls tabify to simplify the data into a table', function () {
        var renderbot = {
          vis: {
            isHierarchical: _.constant(false)
          }
        };
        var football = { tables: [], hits: { total: 1 } };

        var stub = sinon.stub(aggResponse, 'tabify').returns(football);
        expect(buildChartData.call(renderbot, football)).to.eql({ rows: [], hits: 1 });
        expect(stub).to.have.property('callCount', 1);
        expect(stub.firstCall.args[0]).to.be(renderbot.vis);
        expect(stub.firstCall.args[1]).to.be(football);
      });

      it('returns a single chart if the tabify response contains only a single table', function () {
        var chart = { hits: 1, rows: [], columns: [] };
        var renderbot = {
          vis: {
            isHierarchical: _.constant(false),
            type: {
              responseConverter: _.constant(chart)
            }
          }
        };
        var esResp = { hits: { total: 1 } };
        var tabbed = { tables: [ new Table() ] };

        sinon.stub(aggResponse, 'tabify').returns(tabbed);
        expect(buildChartData.call(renderbot, esResp)).to.eql(chart);
      });

      it('converts table groups into rows/columns wrappers for charts', function () {
        var chart = { hits: 1, rows: [], columns: [] };
        var converter = sinon.stub().returns('chart');
        var esResp = { hits: { total: 1 } };
        var tables = [new Table(), new Table(), new Table(), new Table()];

        var renderbot = {
          vis: {
            isHierarchical: _.constant(false),
            type: {
              responseConverter: converter
            }
          }
        };

        var tabify = sinon.stub(aggResponse, 'tabify').returns({
          tables: [
            {
              aggConfig: { params: { row: true } },
              tables: [
                {
                  aggConfig: { params: { row: false } },
                  tables: [ tables[0] ]
                },
                {
                  aggConfig: { params: { row: false } },
                  tables: [ tables[1] ]
                }
              ]
            },
            {
              aggConfig: { params: { row: true } },
              tables: [
                {
                  aggConfig: { params: { row: false } },
                  tables: [ tables[2] ]
                },
                {
                  aggConfig: { params: { row: false } },
                  tables: [ tables[3] ]
                }
              ]
            }
          ]
        });

        var chartData = buildChartData.call(renderbot, esResp);

        // verify tables were converted
        expect(converter).to.have.property('callCount', 4);
        expect(converter.args[0][1]).to.be(tables[0]);
        expect(converter.args[1][1]).to.be(tables[1]);
        expect(converter.args[2][1]).to.be(tables[2]);
        expect(converter.args[3][1]).to.be(tables[3]);

        expect(chartData).to.have.property('rows');
        expect(chartData.rows).to.have.length(2);
        chartData.rows.forEach(function (row) {
          expect(row).to.have.property('columns');
          expect(row.columns).to.eql([ 'chart', 'chart' ]);
        });
      });
    });
  }];
});
