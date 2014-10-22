module.exports = function (grunt) {
  return {
    options: {
      version: '^1.4',
      plugins: [
        'elasticsearch/marvel/latest',
        'mobz/elasticsearch-head'
      ]
    },
    dev: {}
  };
};