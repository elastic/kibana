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

export { noneRequestHandlerProvider };
