// response handler:
// receives response data and vis configuration
// returns a promise
// promise returns response data when resolved

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

export { noneResponseHandler };
