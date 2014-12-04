define(function (require) {
  return ['ResponseWriter class', function () {
    var _ = require('lodash');
    var sinon = require('test_utils/auto_release_sinon');

    var Vis;
    var Table;
    var Buckets;
    var Private;
    var TableGroup;
    var getColumns;
    var indexPattern;
    var ResponseWriter;

    function defineSetup(stubGetColumns) {
      beforeEach(module('kibana'));
      beforeEach(inject(function ($injector) {
        Private = $injector.get('Private');

        if (stubGetColumns) {
          getColumns = sinon.stub();
          Private.stub(require('components/agg_response/tabify/_get_columns'), getColumns);
        }

        ResponseWriter = Private(require('components/agg_response/tabify/_response_writer'));
        TableGroup = Private(require('components/agg_response/tabify/_table_group'));
        Buckets = Private(require('components/agg_response/tabify/_buckets'));
        Table = Private(require('components/agg_response/tabify/_table'));
        Vis = Private(require('components/vis/vis'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      }));
    }

    describe('Constructor', function () {
      defineSetup(true);

      it('gets the columns for the vis', function () {
        var vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
        var writer = new ResponseWriter(vis);

        expect(getColumns).to.have.property('callCount', 1);
        expect(getColumns.firstCall.args[0]).to.be(vis);
      });

      it('collects the aggConfigs from each column in aggStack', function () {
        var aggs = [
          { type: 'date_histogram', schema: 'segment', params: { field: '@timestamp' } },
          { type: 'terms', schema: 'segment', params: { field: 'extension' } },
          { type: 'avg', schema: 'metric', params: { field: '@timestamp' } }
        ];

        getColumns.returns(aggs.map(function (agg) {
          return { aggConfig: agg };
        }));

        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: aggs
        });

        var writer = new ResponseWriter(vis);
        expect(writer.aggStack).to.be.an('array');
        expect(writer.aggStack).to.have.length(aggs.length);
        writer.aggStack.forEach(function (agg, i) {
          expect(agg).to.be(aggs[i]);
        });
      });

      it('sets canSplit=true by default', function () {
        var vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
        var writer = new ResponseWriter(vis);
        expect(writer).to.have.property('canSplit', true);
      });

      it('sets canSplit=false when config says to', function () {
        var vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
        var writer = new ResponseWriter(vis, { canSplit: false });
        expect(writer).to.have.property('canSplit', false);
      });

      describe('sets partialRows', function () {
        it('to the value of the config if set', function () {
          var vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
          var partial = Boolean(Math.round(Math.random()));

          var writer = new ResponseWriter(vis, { partialRows: partial });
          expect(writer).to.have.property('partialRows', partial);
        });

        it('to the value of vis.isHierarchical if no config', function () {
          var vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
          var hierarchical = Boolean(Math.round(Math.random()));
          sinon.stub(vis, 'isHierarchical').returns(hierarchical);

          var writer = new ResponseWriter(vis, {});
          expect(writer).to.have.property('partialRows', hierarchical);
        });
      });

      it('starts off with a root TableGroup', function () {
        var vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });

        var writer = new ResponseWriter(vis);
        expect(writer.root).to.be.a(TableGroup);
        expect(writer.splitStack).to.be.an('array');
        expect(writer.splitStack).to.have.length(1);
        expect(writer.splitStack[0]).to.be(writer.root);
      });
    });

    describe('', function () {
      defineSetup();

      describe('#response()', function () {
        it('returns the root TableGroup if splitting', function () {
          var vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
          var writer = new ResponseWriter(vis);
          expect(writer.response()).to.be(writer.root);
        });

        it('returns the first table if not splitting', function () {
          var vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
          var writer = new ResponseWriter(vis, { canSplit: false });
          var table = writer._table();
          expect(writer.response()).to.be(table);
        });

        it('adds columns to all of the tables', function () {
          var vis = new Vis(indexPattern, {
            type: 'histogram',
            aggs: [
              { type: 'terms', params: { field: '_type' }, schema: 'split' },
              { type: 'count', schema: 'metric' }
            ]
          });
          var buckets = new Buckets({ buckets: [ { key: 'nginx' }, { key: 'apache' } ] });
          var writer = new ResponseWriter(vis);
          var tables = [];

          writer.split(vis.aggs[0], buckets, function () {
            writer.cell(vis.aggs[1], 100, function () {
              tables.push(writer.row());
            });
          });

          tables.forEach(function (table) {
            expect(table.columns == null).to.be(true);
          });

          var resp = writer.response();
          expect(resp).to.be.a(TableGroup);
          expect(resp.tables).to.have.length(2);

          var nginx = resp.tables.shift();
          expect(nginx).to.have.property('aggConfig', vis.aggs[0]);
          expect(nginx).to.have.property('key', 'nginx');
          expect(nginx.tables).to.have.length(1);
          nginx.tables.forEach(function (table) {
            expect(_.contains(tables, table)).to.be(true);
          });

          var apache = resp.tables.shift();
          expect(apache).to.have.property('aggConfig', vis.aggs[0]);
          expect(apache).to.have.property('key', 'apache');
          expect(apache.tables).to.have.length(1);
          apache.tables.forEach(function (table) {
            expect(_.contains(tables, table)).to.be(true);
          });

          tables.forEach(function (table) {
            expect(table.columns).to.be.an('array');
            expect(table.columns).to.have.length(1);
            expect(table.columns[0].aggConfig.type.name).to.be('count');
          });
        });
      });

      describe('#split()', function () {
        it('creates a table group, pushes that group onto the splitStack, calls the block, and removes the group from the stack',
        function () {
          var vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
          var writer = new ResponseWriter(vis);

          var table = writer._table();
          writer.cell({}, 1, function () {
            writer.cell({}, 2, function () {
              writer.cell({}, 3, function () {
                writer.row();
              });
            });
          });


          expect(table.rows).to.have.length(1);
          expect(table.rows[0]).to.eql([1, 2, 3]);
        });

        it('with break if the user has specified that splitting is to be disabled', function () {
          var vis = new Vis(indexPattern, {
            type: 'histogram',
            aggs: [
              { type: 'terms', schema: 'split', params: { field: '_type' } },
              { type: 'count', schema: 'metric' }
            ]
          });
          var agg = vis.aggs.bySchemaName.split[0];
          var buckets = new Buckets({ buckets: [ { key: 'apache' } ]});
          var writer = new ResponseWriter(vis, { canSplit: false });

          expect(function () {
            writer.split(agg, buckets, _.noop);
          }).to.throwException(/splitting is disabled/);
        });
      });

      describe('#cell()', function () {
        it('logs a cell in the ResponseWriters row buffer, calls the block arg, then removes the value from the buffer',
        function () {
          var vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
          var writer = new ResponseWriter(vis);

          expect(writer.rowBuffer).to.have.length(0);
          writer.cell({}, 500, function () {
            expect(writer.rowBuffer).to.have.length(1);
            expect(writer.rowBuffer[0]).to.be(500);
          });
          expect(writer.rowBuffer).to.have.length(0);
        });
      });

      describe('#row()', function () {
        it('writes the ResponseWriters internal rowBuffer into a table', function () {
          var vis = new Vis(indexPattern, { type: 'histogram', aggs: [] });
          var writer = new ResponseWriter(vis);

          var table = writer._table();
          writer.cell({}, 1, function () {
            writer.cell({}, 2, function () {
              writer.cell({}, 3, function () {
                writer.row();
              });
            });
          });

          expect(table.rows).to.have.length(1);
          expect(table.rows[0]).to.eql([1, 2, 3]);
        });

        it('always writes to the table group at the top of the split stack', function () {
          var vis = new Vis(indexPattern, {
            type: 'histogram',
            aggs: [
              { type: 'terms', schema: 'split', params: { field: '_type' } },
              { type: 'terms', schema: 'split', params: { field: 'extension' } },
              { type: 'terms', schema: 'split', params: { field: 'machine.os' } },
              { type: 'count', schema: 'metric' }
            ]
          });
          var splits = vis.aggs.bySchemaName.split;

          var type = splits[0];
          var typeBuckets = new Buckets({ buckets: [ { key: 'nginx' }, { key: 'apache' } ] });

          var ext = splits[1];
          var extBuckets = new Buckets({ buckets: [ { key: 'jpg' }, { key: 'png' } ] });

          var os = splits[2];
          var osBuckets = new Buckets({ buckets: [ { key: 'windows' }, { key: 'mac' } ] });

          var count = vis.aggs[3];

          var writer = new ResponseWriter(vis);
          writer.split(type, typeBuckets, function () {
            writer.split(ext, extBuckets, function () {
              writer.split(os, osBuckets, function (bucket, key) {
                writer.cell(count, key === 'windows' ? 1 : 2, function () {
                  writer.row();
                });
              });
            });
          });

          var resp = writer.response();
          var sum = 0;
          var tables = 0;
          (function recurse(t) {
            if (t.tables) {
              // table group
              t.tables.forEach(function (tt) {
                recurse(tt);
              });
            } else {
              tables += 1;
              // table
              t.rows.forEach(function (row) {
                row.forEach(function (cell) {
                  sum += cell;
                });
              });
            }
          }(resp));

          expect(tables).to.be(8);
          expect(sum).to.be(12);
        });

        it('writes partial rows for hierarchical vis', function () {
          var vis = new Vis(indexPattern, {
            type: 'pie',
            aggs: [
              { type: 'terms', schema: 'segment', params: { field: '_type' }},
              { type: 'count', schema: 'metric' }
            ]
          });

          var writer = new ResponseWriter(vis);
          var table = writer._table();
          writer.cell(vis.aggs[0], 'apache', function () {
            writer.row();
          });

          expect(table.rows).to.have.length(1);
          expect(table.rows[0]).to.eql(['apache', '']);
        });

        it('skips partial rows for non-hierarchical vis', function () {
          var vis = new Vis(indexPattern, {
            type: 'histogram',
            aggs: [
              { type: 'terms', schema: 'segment', params: { field: '_type' }},
              { type: 'count', schema: 'metric' }
            ]
          });

          var writer = new ResponseWriter(vis);
          var table = writer._table();
          writer.cell(vis.aggs[0], 'apache', function () {
            writer.row();
          });

          expect(table.rows).to.have.length(0);
        });
      });
    });
  }];
});