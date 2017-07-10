import { AggResponseIndexProvider } from 'ui/agg_response/index';

const TabifyResponseHandlerProvider = function (Private) {
  const aggResponse = Private(AggResponseIndexProvider);

  return {
    name: 'tabify',
    handler: function (vis, response) {
      return new Promise((resolve) => {

        const tableGroup = aggResponse.tabify(vis, response, {
          canSplit: true,
          asAggConfigResults: true
        });

        resolve(tableGroup);
      });
    }
  };
};

export { TabifyResponseHandlerProvider };
