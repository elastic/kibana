/* jshint node:true */

var connect = require('connect');
var http = require('http');
var Promise = require('bluebird');

var instrumentationMiddleware = require('./_instrumentation');
var amdRapperMiddleware = require('./_amd_rapper');
var proxy = require('http-proxy').createProxyServer({});

var glob = require('glob');
var path = require('path');
var join = path.join;
var rel = join.bind(null, __dirname);
var ROOT = rel('../../../');
var SRC = join(ROOT, 'src');
var APP = join(SRC, 'kibana');
var TEST = join(ROOT, 'test');
var PLUGINS = join(SRC, 'plugins');

module.exports = function DevServer(opts) {
  opts = opts || {};

  var server = this;
  var app = connect();
  var httpServer = http.createServer(app);

  // Kibana Backend Proxy
  app.use(function (req, res, next) {
    // Proxy config and es requests to the Kibana Backend
    if (/^\/(config|elasticsearch\/)/.test(req.url)) {
      return proxy.web(req, res, { target: 'http://localhost:5601' });
    }

    next();
  });

  app.use(instrumentationMiddleware({
    root: SRC,
    displayRoot: SRC,
    filter: function (filename) {
      return filename.match(/.*\/src\/.*\.js$/)
        && !filename.match(/.*\/src\/kibana\/bower_components\/.*\.js$/)
        && !filename.match(/.*\/src\/kibana\/utils\/(event_emitter|next_tick|rison)\.js$/);
    }
  }));

  app.use(instrumentationMiddleware({
    root: APP,
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

  app.use(connect.static(ROOT));
  app.use(connect.static(APP));
  app.use('/test', connect.static(TEST));
  app.use('/plugins', connect.static(PLUGINS));

  app.use('/specs', function (req, res) {
    var unit = join(ROOT, '/test/unit/');
    glob(join(unit, 'specs/**/*.js'), function (er, files) {
      var moduleIds = files
      .filter(function (filename) {
        return path.basename(filename).charAt(0) !== '_';
      })
      .map(function (filename) {
        return path.relative(unit, filename).replace(/\.js$/, '');
      });

      res.end(JSON.stringify(moduleIds));
    });
  });

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
