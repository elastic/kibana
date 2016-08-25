const path = require('path');
const rootDir = path.join(__dirname, 'scenarios');

module.exports = {
  scenarios: {
    makelogs: {
      baseDir: path.join(rootDir, 'makelogs'),
      bulk: [{
        indexName: 'logstash-2015.09.17',
        indexDefinition: 'makelogs_index_definition.js',
        source: 'logstash-2015.09.17.js'
      }, {
        indexName: 'logstash-2015.09.18',
        indexDefinition: 'makelogs_index_definition.js',
        source: 'logstash-2015.09.18.js'
      }]
    },
    emptyKibana: {
      baseDir: path.join(rootDir, 'empty_kibana'),
      bulk: [{
        indexName: '.kibana',
        indexDefinition: 'kibana_definition.js',
        source: 'kibana.js',
        haltOnFailure: false
      }]
    },
    logstashFunctional: {
      baseDir: path.join(rootDir, 'logstash_functional'),
      bulk: [{
        indexDefinition: 'makelogs_index_definition.js',
        indexName: 'logstash-2015.09.20',
        source: 'logstash-2015.09.20.js'
      }, {
        indexDefinition: 'makelogs_index_definition.js',
        indexName: 'logstash-2015.09.21',
        source: 'logstash-2015.09.21.js'
      }, {
        indexDefinition: 'makelogs_index_definition.js',
        indexName: 'logstash-2015.09.22',
        source: 'logstash-2015.09.22.js'
      }]
    }
  }
};
