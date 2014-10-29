module.exports = function (grunt) {
  return {
    options: {
      version: '^1.4',
      plugins: [
        'mobz/elasticsearch-head'
      ],
      config: {
        network: {
          host: '127.0.0.1'
        }
      }
    },
    dev: {}
  };
};