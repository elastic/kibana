/* jshint node:true */

var connect = require('connect');
var http = require('http');
var Promise = require('bluebird');

var instrumentationMiddleware = require('./_instrumentation');
var amdRapperMiddleware = require('./_amd_rapper');
var rel = require('path').join.bind(null, __dirname);

var proxy = require('http-proxy').createProxyServer({});
var ROOT = rel('../../../');
var SRC = rel('../../../src');

module.exports = function DevServer(opts) {
  opts = opts || {};

  var server = this;
  var app = connect();
  var httpServer = http.createServer(app);

  app.use(instrumentationMiddleware({
    root: ROOT,
    displayRoot: SRC,
    filter: function (filename) {
      return filename.match(/.*\/src\/.*\.js$/)
        && !filename.match(/.*\/src\/kibana\/bower_components\/.*\.js$/)
        && !filename.match(/.*\/src\/kibana\/utils\/(event_emitter|next_tick|rison)\.js$/);
    }
  }));

  app.use(amdRapperMiddleware({
    root: ROOT
  }));

  app.use('/es-proxy', function (req, res) {
    req.url = req.url.replace(/^\/es-proxy/, '');
    proxy.web(req, res, { target: 'http://localhost:' + (process.env.ES_PORT || 9200) });
  });

  // Kibana Backend Proxy
  app.use(function (req, res, next) {
    // Don't proxy test requests
    if (/^\/(test|src|node_modules)/.test(req.url)) return next();
    // Proxy everything else to the Kibana backend
    proxy.web(req, res, { target: 'http://localhost:5601' });
  });

  app.use(connect.static(ROOT));

  // respond to the "maybe_start_server" pings
  app.use(function (req, res, next) {
    if (req.method !== 'HEAD' || req.url !== '/') return next();
    res.statusCode === 200;
    res.setHeader('Pong', 'Kibana 4 Dev Server');
    res.end();
  });

  app.use(function (req, res, next) {
    if (req.url !== '/') return next();
    res.statusCode = 303;
    res.setHeader('Location', '/src/');
    res.end();
  });

  // prevent chrome's stupid "this page is in spanish" on the directories page
  app.use(function (req, res, next) {
    res.setHeader('Content-Language', 'en');
    next();
  });

  // allow browsing directories
  app.use(connect.directory(ROOT));

  server.listenOnFirstOpenPort = function (ports) {
    var options = ports.slice(0);

    // wrap this logic in an IIFE so that we can call it again later
    return (function attempt() {
      var port = options.shift();
      if (!port) return Promise.reject(new Error('None of the supplied options succeeded'));

      return server.listen(port)
      // filter out EADDRINUSE errors and call attempt again
      .catch(function (err) {
        if (err.code === 'EADDRINUSE') return attempt();
        throw err;
      });
    })();
  };

  server.listen = function (port) {
    return new Promise(function (resolve, reject) {
      var done = function (err) {
        httpServer.removeListener('error', done);
        httpServer.removeListener('listening', done);

        // pass the error along
        if (err) return reject(err);

        resolve(server.port = httpServer.address().port);
      };

      // call done with an error
      httpServer.on('error', done, true);
      // call done without any args
      httpServer.on('listening', done, true);

      httpServer.listen(port);
    });
  };

  server.close = httpServer.close.bind(httpServer);
};
