/* jshint node:true */
var _ = require('lodash');
var Promise = require('bluebird');

var portOptions = (
  '4000,4001,4040,4321,4502,4503,4567,5000,5001,5050,5555,5432,6000,6001,6060,' +
  '6666,6543,7000,7070,7774,7777,8000,8001,8003,8031,8080,8081,8443,8765,8777,' +
  '8888,9000,9001,9031,9080,9090,9876,9877,9999,49221,55001'
).split(',').map(function (p) { return _.parseInt(p); });

module.exports = function SauceLabsProxy(opts) {
  if (!(this instanceof SauceLabsProxy)) return new SauceLabsProxy(opts);

  var proxy = this;
  var pass = require('http-proxy').createProxyServer({});

  var routes = [];

  var send404 = function (req, res) {
    res.statusCode = 404;
    res.end('unable to find ' + req.url);
  };

  var sendErr = function (req, res, err) {
    res.statusCode = 500;
    res.end('error: ' + err.message);
  };

  var server = require('http').createServer(function(req, res) {
    var route = _.find(routes, function (route) {
      return route.re.test(req.url);
    });

    if (!route) return send404(req, res);

    var origEnd = res.end;
    var respEnded = false;
    res.end = function () {
      respEnded = true;
      origEnd.apply(res, arguments);
    };

    Promise.cast(route.middleware && route.middleware(req, res))
    .then(function (ret) {
      if (!respEnded) pass.web(req, res, { target: route.target });
    })
    .catch(function (err) {
      return sendErr(res, res, err);
    });
  });

  proxy.on = function (prefix, opts) {
    var route = {};

    if (_.isRegExp(prefix)) {
      route.re = prefix;
    }
    else if (prefix === '*') {
      route.re = /.*/;
    }
    else {
      route.re = new RegExp('^' + prefix);
    }

    if (_.isString(opts)) {
      route.target = opts;
    }

    if (_.isPlainObject(opts)) {
      _.assign(route, opts);
    }

    routes.push(route);
    return route;
  };

  proxy.listen = function () {
    return new Promise(function (resolve, reject) {
      var port;

      var nextPort = function () {
        port = portOptions.shift();
        if (!port) done(new Error('No more port options available.'));
        server.listen(port);
      };

      var onError = function (err) {
        if (err && err.code === 'EADDRINUSE') nextPort();
        else done(err);
      };

      var onListening = function () {
        done();
      };

      var done = function (err) {
        server.removeListener('error', onError);
        server.removeListener('listening', onListening);
        if (err) reject(err);
        else resolve(port);
      };

      server.on('error', onError, true);
      server.on('listening', onListening, true);
      nextPort();
    });
  };
};