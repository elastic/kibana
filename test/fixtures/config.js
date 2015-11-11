var path = require('path');
var rootDir = path.join(__dirname, 'scenarios');

module.exports = {
  scenarios: {
    makelogs: {
      baseDir: path.join(rootDir, 'makelogs'),
      bulk: [{
        indexName: 'logstash-2015.09.17',
        indexDefinition: 'makelogsIndexDefinition.js',
        source: 'logstash-2015.09.17.js'
      }, {
        indexName: 'logstash-2015.09.18',
        indexDefinition: 'makelogsIndexDefinition.js',
        source: 'logstash-2015.09.18.js'
      }]
    },
    emptyKibana: {
      baseDir: path.join(rootDir, 'emptyKibana'),
      bulk: [{
        indexName: '.kibana',
        indexDefinition: 'kibanaDefinition.js',
        source: 'kibana.js',
        haltOnFailure: false
      }]
    }
  }
};
