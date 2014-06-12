var Proxy = require('./test/utils/proxy');
var Promise = require('bluebird');

var configfile = require('fs').readFileSync(__dirname + '/src/config.js', 'utf8').replace(
  /elasticsearch:[^\n]+/,
  'elasticsearch: \'http://\' + window.location.host + \'/es-proxy\','
);

var p = new Proxy();
p.on('/es-proxy', {
  target: 'http://localhost:9200',
  middleware: function (req, res) {
    // strip the prefix
    req.url = req.url.replace(/^\/es-proxy/, '');
  }
});

p.on('/src/config.js', {
  target: 'http://localhost:8000',
  middleware: function (req, res) {
    // overwrite the contents of the file
    res.end(configfile);
  }
});

// send all other requests to localhost:8000
p.on('*', 'http://localhost:8000');

p.listen()
  .then(console.log.bind(console, 'listening on %s'))
  .catch(console.error.bind(console));