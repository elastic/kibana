var path = require('path');
var rootDir = path.join(__dirname, 'scenarios');

module.exports = {
  logstash: {
    base: path.join(rootDir, 'logstash'),
    bulk: [{
      mapping: 'mapping',
      file: 'logstash-2015.09.17'
    }, {
      mapping: 'mapping',
      file: 'logstash-2015.09.18'
    }]
  },
  logstashFunctional: {
    base: path.join(rootDir, 'logstashFunctional'),
    bulk: [{
      mapping: 'mapping',
      file: 'logstash-2015.09.20'
    }, {
      mapping: 'mapping',
      file: 'logstash-2015.09.21'
    }, {
      mapping: 'mapping',
      file: 'logstash-2015.09.22'
    }]
  },
  emptyKibana: {
    base: path.join(rootDir, 'emptyKibana'),
    bulk: [{
      file: '.kibana'
    }]
  }
};
