define(function (require) {
  return function VislibVisBuildChartData(Private) {
    let aggResponse = Private(require('ui/agg_response/index'));
    let Table = Private(require('ui/agg_response/tabify/_table'));

    return function (esResponse) {
      let vis = this.vis;

      if (vis.isHierarchical()) {
        // the hierarchical converter is very self-contained (woot!)
        return aggResponse.hierarchical(vis, esResponse);
      }

      let tableGroup = aggResponse.tabify(vis, esResponse, {
        canSplit: true,
        asAggConfigResults: true
      });

      let converted = convertTableGroup(vis, tableGroup);
      if (!converted) {
        // mimic a row of tables that doesn't have any tables
        // https://github.com/elastic/kibana/blob/7bfb68cd24ed42b1b257682f93c50cd8d73e2520/src/kibana/components/vislib/components/zero_injection/inject_zeros.js#L32
        converted = { rows: [] };
      }

      converted.hits = esResponse.hits.total;

      return converted;
    };

    function convertTableGroup(vis, tableGroup) {
      let tables = tableGroup.tables;
      let firstChild = tables[0];
      if (firstChild instanceof Table) {

        let chart = convertTable(vis, firstChild);
        // if chart is within a split, assign group title to its label
        if (tableGroup.$parent) {
          chart.label = tableGroup.title;
        }
        return chart;
      }

      if (!tables.length) return;
      let out = {};
      let outList;

      tables.forEach(function (table) {
        if (!outList) {
          let aggConfig = table.aggConfig;
          let direction = aggConfig.params.row ? 'rows' : 'columns';
          outList = out[direction] = [];
        }

        let output;
        if (output = convertTableGroup(vis, table)) {
          outList.push(output);
        }
      });

      return out;
    }

    function convertTable(vis, table) {
      return vis.type.responseConverter(vis, table);
    }
  };
});
