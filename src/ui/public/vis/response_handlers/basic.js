import { AggResponseIndexProvider } from '../../agg_response';
import { TabifyTable } from '../../agg_response/tabify/_table';

import { VisResponseHandlersRegistryProvider } from '../../registry/vis_response_handlers';

const BasicResponseHandlerProvider = function (Private) {
  const aggResponse = Private(AggResponseIndexProvider);

  function convertTableGroup(vis, tableGroup) {
    const tables = tableGroup.tables;
    const firstChild = tables[0];
    if (firstChild instanceof TabifyTable) {

      const chart = convertTable(vis, firstChild);
      // if chart is within a split, assign group title to its label
      if (tableGroup.$parent) {
        chart.label = tableGroup.title;
      }
      return chart;
    }

    if (!tables.length) return;
    const out = {};
    let outList;

    tables.forEach(function (table) {
      if (!outList) {
        const aggConfig = table.aggConfig;
        const direction = aggConfig.params.row ? 'rows' : 'columns';
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
    return vis.type.responseConverter ? vis.type.responseConverter(vis, table) : table;
  }

  return {
    name: 'basic',
    handler: function (vis, response) {
      return new Promise((resolve) => {
        if (vis.isHierarchical()) {
          // the hierarchical converter is very self-contained (woot!)
          resolve(aggResponse.hierarchical(vis, response));
        }

        const tableGroup = aggResponse.tabify(vis.getAggConfig().getResponseAggs(), response, {
          canSplit: true,
          asAggConfigResults: true,
          isHierarchical: vis.isHierarchical()
        });

        let converted = convertTableGroup(vis, tableGroup);
        if (!converted) {
          // mimic a row of tables that doesn't have any tables
          // https://github.com/elastic/kibana/blob/7bfb68cd24ed42b1b257682f93c50cd8d73e2520/src/kibana/components/vislib/components/zero_injection/inject_zeros.js#L32
          converted = { rows: [] };
        }

        converted.hits = response.hits.total;

        resolve(converted);
      });
    }
  };
};

VisResponseHandlersRegistryProvider.register(BasicResponseHandlerProvider);

export { BasicResponseHandlerProvider };
