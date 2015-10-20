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
  logstashFunctional: {
    baseDir: path.join(rootDir, 'logstashFunctional'),
    bulk: [{
      indexDefinition: 'makelogsIndexDefinition.js',
      indexName: 'logstash-2015.09.20',
      source: 'logstash-2015.09.20-1.js'
    }]
  },
  // logstashFunctional: {
  //   baseDir: path.join(rootDir, 'logstashFunctional'),
  //   bulk: [{
  //     indexDefinition: 'makelogsIndexDefinition.js',
  //     indexName: 'logstash-2015.09.20',
  //     source: 'logstash-2015.09.20.js'
  //   }, {
  //     indexDefinition: 'makelogsIndexDefinition.js',
  //     indexName: 'logstash-2015.09.21',
  //     source: 'logstash-2015.09.21.js'
  //   }, {
  //     indexDefinition: 'makelogsIndexDefinition.js',
  //     indexName: 'logstash-2015.09.22',
  //     source: 'logstash-2015.09.22.js'
  //   }]
  // },
  emptyKibana: {
    baseDir: path.join(rootDir, 'emptyKibana'),
    bulk: [{
      indexName: '.kibana',
      source: 'kibana.js'
    }]
  }
};
