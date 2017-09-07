import _ from 'lodash';
import { AggResponseIndexProvider } from 'ui/agg_response/index';
import { VisResponseHandlersRegistryProvider } from 'ui/registry/vis_response_handlers';

const TabifyResponseHandlerProvider = function (Private) {
  const aggResponse = Private(AggResponseIndexProvider);

  return {
    name: 'tabify',
    handler: function (vis, response) {
      return new Promise((resolve) => {

        const tableGroup = aggResponse.tabify(vis, response, {
          canSplit: true,
          asAggConfigResults: _.get(vis, 'type.responseHandlerConfig.asAggConfigResults', false)
        });

        resolve(tableGroup);
      });
    }
  };
};

VisResponseHandlersRegistryProvider.register(TabifyResponseHandlerProvider);

export { TabifyResponseHandlerProvider };
