define(function (require) {
  describe('Tabify Agg Response', function () {
    var _ = require('lodash');
    var hierarchicalFixtures = require('fixtures/fake_hierarchical_data');

    var aggId = _.partial(_.uniqueId, '_agg_fixture');
    var bucketKey = _.partial(_.uniqueId, '_bucket_key');
    var docCount = _.partial(_.random, 0, 1000);

    var tabifyAggResponse;
    var TableGroup;
    var Table;
    var indexPattern;
    var Vis;
    var AggConfig;

    function reduceProp(prop, op, base) {
      return function (arr) {
        return arr.reduce(function (x, obj) {
          return op(x, obj[prop]);
        }, base);
      };
    }
    var minLength = reduceProp('length', Math.min, Infinity);
    var maxLength = reduceProp('length', Math.max, 0);

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private) {
      tabifyAggResponse = Private(require('components/agg_response/tabify/tabify_agg_response'));
      TableGroup = Private(require('components/agg_response/tabify/_table_group'));
      Table = Private(require('components/agg_response/tabify/_table'));

      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      Vis = Private(require('components/vis/vis'));
      AggConfig = Private(require('components/vis/_agg_config'));
    }));

    describe('with only a metric', function () {
      function makeOneMetricVis(type) {
        return new Vis(indexPattern, {
          type: type,
          aggs: [
            {
              type: 'count',
              schema: 'metric',
              params: {}
            }
          ]
        });
      }

      function oneMetricChecks(vis, split) {
        var resp = tabifyAggResponse(vis, hierarchicalFixtures.metricOnly, { canSplit: !!split });
        var table;

        if (split) {
          // check table group
          expect(resp).to.be.a(TableGroup);
          expect(resp.tables).to.be.an('array');
          expect(resp.tables).to.have.length(1);

          // unwrap table
          table = resp.tables[0];
        } else {
          table = resp;
        }

        expect(table).to.be.a(Table);
        expect(table.rows).to.be.an('array');
        expect(table.columns).to.be.an('array');

        // check length of Table props
        expect(table.rows).to.have.length(1);
        expect(table.columns).to.have.length(minLength(table.rows));
        expect(table.columns).to.have.length(maxLength(table.rows));
      }

      describe('on a hierarchical vis', function () {
        it('responds properly', function () {
          oneMetricChecks(makeOneMetricVis('pie'), true);
        });

        it('responds properly without splits', function () {
          oneMetricChecks(makeOneMetricVis('pie'), false);
        });
      });

      describe('on a non hierarchical vis', function () {
        it('responds properly', function () {
          oneMetricChecks(makeOneMetricVis('histogram'), true);
        });

        it('responds properly without splits', function () {
          oneMetricChecks(makeOneMetricVis('histogram'), false);
        });
      });
    });

    describe.only('with three term buckets', function () {
      function testThreeTermVis(type, renderSplit, schemaNames, validResp) {
        var vis = new Vis(indexPattern, {
          type: type,
          aggs: schemaNames.map(function (schemaName) {
            return {
              type: 'terms',
              params: {
                field: 'extension'
              },
              schema: schemaName
            };
          })
        });

        var resp = tabifyAggResponse(vis, hierarchicalFixtures.threeTermBucketsForAggs(vis), {
          canSplit: renderSplit
        });

        pickValidation(validResp, resp);
        function pickValidation(validResp, resp) {
          if (validResp.type === 'TableGroup') {
            validateTableGroup(validResp, resp);
          } else {
            validateTable(validResp, resp);
          }
        }

        function validateTableGroup(valid, tg) {
          expect(tg).to.be.a(TableGroup);

          // aggConfig prop
          expect(tg).to.have.property('aggConfig');
          if (valid.aggConfig == null) {
            expect(tg.aggConfig == null).to.be.ok();
          } else {
            expect(tg.aggConfig).to.be(vis.aggs[valid.aggConfig]);
          }

          // key prop
          if (tg.key == null) {
            expect(valid.key == null).to.be.ok();
          } else {
            expect(tg.key).to.be(valid.key);
          }

          // sub-tables
          expect(tg.tables).to.be.an('array');
          expect(tg.tables).to.have.length(valid.tables.length);

          valid.tables.forEach(function (v, i) {
            pickValidation(v, tg.tables[i]);
          });
        }

        function validateTable(valid, t) {
          expect(t).to.be.a(Table);
          expect(t).to.not.have.own.property('key');
          expect(t).to.not.have.own.property('aggConfig');

          expect(t.columns).to.be.an('array');
          expect(t.columns).to.have.length(valid.columns.length);
          valid.columns.forEach(function (aggI, columnI) {
            var agg = vis.aggs[aggI];
            var col = t.columns[columnI];

            expect(col).to.have.property('aggConfig', agg);
            expect(col).to.have.property('title', agg.makeLabel());
          });

          expect(t.rows).to.be.an('array');
          expect(t.rows).to.have.length(valid.rows.length);
          t.rows.forEach(function (row, i) {
            expect(row).to.eql(valid.rows[i]);
          });
        }
      }

      describe('on a hierarchical vis', function () {
        var visType = 'pie';
        var baseTable = {
          type: 'Table',
          columns: [0, 3, 1, 3, 2, 3],
          rows: [
            ['png',  50, 'IT', 10, 'win', 4],
            ['png',  50, 'IT', 10, 'mac', 6],
            ['png',  50, 'US', 20, 'linux', 12],
            ['png',  50, 'US', 20, 'mac', 8],
            ['css',  20, 'MX',  7, 'win', 3],
            ['css',  20, 'MX',  7, 'mac', 4],
            ['css',  20, 'US', 13, 'linux', 12],
            ['css',  20, 'US', 13, 'mac', 1],
            ['html', 90, 'CN', 85, 'win', 46],
            ['html', 90, 'CN', 85, 'mac', 39],
            ['html', 90, 'FR', 15, 'win', 3],
            ['html', 90, 'FR', 15, 'mac', 12]
          ]
        };

        function subRows(where, fromCol) {
          return _.transform(baseTable.rows, function (rows, row) {
            if (row[where[0]] === where[1]) {
              rows.push(row.slice(fromCol));
            }
          });
        }

        var schemaScenaios = [
          {
            names: ['segment', 'segment', 'segment'],
            split: false,
            resp: baseTable
          },
          {
            names: ['segment', 'segment', 'segment'],
            split: true,
            resp: {
              type: 'TableGroup',
              aggConfig: null,
              key: null,
              tables: [
                baseTable
              ]
            }
          },
          {
            names: ['split', 'segment', 'segment'],
            split: true,
            resp: {
              type: 'TableGroup',
              aggConfig: null,
              key: null,
              tables: [
                {
                  type: 'TableGroup',
                  aggConfig: 0,
                  key: 'png',
                  tables: [
                    {
                      type: 'Table',
                      columns: baseTable.columns.slice(2),
                      rows: subRows([0, 'png'], 2)
                    }
                  ]
                },
                {
                  type: 'TableGroup',
                  aggConfig: 0,
                  key: 'css',
                  tables: [
                    {
                      type: 'Table',
                      columns: baseTable.columns.slice(2),
                      rows: subRows([0, 'css'], 2)
                    }
                  ]
                },
                {
                  type: 'TableGroup',
                  aggConfig: 0,
                  key: 'html',
                  tables: [
                    {
                      type: 'Table',
                      columns: baseTable.columns.slice(2),
                      rows: subRows([0, 'html'], 2)
                    }
                  ]
                }
              ]
            }
          },
          {
            names: ['split', 'segment', 'segment'],
            split: false,
            resp: baseTable
          }
          // ['segment', 'split', 'segment'],
          // ['segment', 'segment', 'split'],
          // ['split', 'split', 'segment'],
          // ['split', 'segment', 'split'],
          // ['segment', 'split', 'split']
        ].slice(0, 2).forEach(function (scenario) {
          var splits = scenario.names.map(function (schema, i) {
            if (schema === 'split') return i + 1;
          }).filter(Boolean);

          var has = splits.length ? 'splits at ' + splits.join(', ') : 'no splits';
          var split = scenario.split ? 'is' : 'is NOT';

          it('responds properly when it has ' + has + ' and ' + split + ' rendered as a split', function () {
            testThreeTermVis(visType, scenario.split, scenario.names, scenario.resp);
          });
        });
      });
    });

    describe('with one range bucket', function () {
      it('responds correctly', function () {
        var vis = new Vis(indexPattern, {
          aggs: [
            {
              type: 'count',
              schema: 'metric'
            }
          ]
        });

        tabifyAggResponse(vis, hierarchicalFixtures.oneRangeBucket);
      });
    });

    describe('with one filter bucket', function () {
      it('responds correctly', function () {
        var vis = new Vis(indexPattern, {
          aggs: [
            {
              type: 'count',
              schema: 'metric'
            }
          ]
        });

        tabifyAggResponse(vis, hierarchicalFixtures.oneFilterBucket);
      });
    });

    describe('with one histogram bucket', function () {
      it('responds correctly', function () {
        var vis = new Vis(indexPattern, {
          aggs: [
            {
              type: 'count',
              schema: 'metric'
            }
          ]
        });

        tabifyAggResponse(vis, hierarchicalFixtures.oneHistogramBucket);
      });
    });
  });
});