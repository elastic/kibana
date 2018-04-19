// response handler:
// receives response data and vis configuration
// returns a promise
// promise returns response data when resolved

import { VisResponseHandlersRegistryProvider } from '../../registry/vis_response_handlers';

const noneResponseHandler = function () {
  return {
    name: 'none',
    handler: function (vis, response) {
      return new Promise((resolve) => {
        resolve(response);
      });
    }
  };
};

VisResponseHandlersRegistryProvider.register(noneResponseHandler);

export { noneResponseHandler };
