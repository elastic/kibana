var path = require('path');


module.exports = function (grunt) {
  return {
    options: {
      runType: 'runner',
      config: 'test/intern',
      reporters: ['Console']
    },
    dev: {}
  };
};
