var path = require('path');
var rootDir = path.join(__dirname, 'scenarios');

module.exports = {
  makelogs: {
    base: path.join(rootDir, 'makelogs'),
    mapping: 'mapping',
    bulk: ['logstash-2015.09.17', 'logstash-2015.09.18']
  },
  emptyKibana: {
    base: path.join(rootDir, 'emptyKibana'),
    bulk: ['.kibana']
  }
};
