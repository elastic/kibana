import { VisRequestHandlersRegistryProvider } from '../../registry/vis_request_handlers';

const noneRequestHandlerProvider = function () {
  return {
    name: 'none',
    handler: function () {
      return new Promise((resolve) => {
        resolve();
      });
    }
  };
};

VisRequestHandlersRegistryProvider.register(noneRequestHandlerProvider);

export { noneRequestHandlerProvider };
