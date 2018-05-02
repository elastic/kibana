import _ from 'lodash';
import { AggResponseIndexProvider } from '../../agg_response';
import { VisResponseHandlersRegistryProvider } from '../../registry/vis_response_handlers';

const TabifyResponseHandlerProvider = function (Private) {
  const aggResponse = Private(AggResponseIndexProvider);

  return {
    name: 'tabify',
    handler: function (vis, response) {
      return new Promise((resolve) => {

        const tableGroup = aggResponse.tabify(vis.getAggConfig().getResponseAggs(), response, {
          canSplit: true,
          asAggConfigResults: _.get(vis, 'type.responseHandlerConfig.asAggConfigResults', false),
          isHierarchical: vis.isHierarchical()
        });

        resolve(tableGroup);
      });
    }
  };
};

VisResponseHandlersRegistryProvider.register(TabifyResponseHandlerProvider);

export { TabifyResponseHandlerProvider };
