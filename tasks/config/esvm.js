module.exports = function (grunt) {
  return {
    options: {
      version: '^1.4',
      plugins: [
        'mobz/elasticsearch-head'
      ]
    },
    dev: {}
  };
};