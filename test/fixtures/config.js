var path = require('path');
var rootDir = path.join(__dirname, 'scenarios');

module.exports = {
  makelogs: {
    baseDir: path.join(rootDir, 'makelogs'),
    bulk: [{
      indexDefinition: 'makelogsIndexDefinition.js',
      indexName: 'logstash-2015.09.17',
      source: 'logstash-2015.09.17.js'
    }, {
      indexDefinition: 'makelogsIndexDefinition.js',
      indexName: 'logstash-2015.09.18',
      source: 'logstash-2015.09.18.js'
    }]
  },
  emptyKibana: {
    baseDir: path.join(rootDir, 'emptyKibana'),
    bulk: [{
      indexName: '.kibana',
      source: 'kibana.js'
    }]
  }
};
