module.exports = function (grunt) {
  return {
    options: {
      version: '^1.4',
      plugins: [
        'elasticsearch/marvel/latest'
      ],
      config: {
        network: {
          host: '127.0.0.1'
        },
        marvel: {
          agent: {
            enabled: false
          }
        }
      }
    },
    dev: {}
  };
};