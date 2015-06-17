var config = require('../utils/server-config');
var unitTestUrl = require('util').format('http://localhost:%d/test/unit/', config.get('kibana.server.port'));

module.exports = {
  options: {
    log: true,
    logErrors: true,
    run: false
  },
  unit: {
    options: {
      urls: [ unitTestUrl ]
    }
  }
};
