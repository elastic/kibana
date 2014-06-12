/* jshint node:true */
var wd = require('wd');
var Promise = require('bluebird');
var readFileSync = require('fs').readFileSync;
var rel = require('path').join.bind(null, __dirname);

var Connector = require('./_connector');
var DevServer = require('./_dev_server');

var portOptions = [
  4000, 4001, 4040, 4321, 4502, 4503, 4567, 5000, 5001, 5050, 5555, 5432, 6000, 6001, 6060,
  6666, 6543, 7000, 7070, 7774, 7777, 8000, 8001, 8003, 8031, 8080, 8081, 8443, 8765, 8777,
  8888, 9000, 9001, 9031, 9080, 9090, 9876, 9877, 9999, 49221, 55001
];

var configfile = readFileSync(rel('../../src/config.js'), 'utf8').replace(
  /elasticsearch:[^\n]+/,
  'elasticsearch: \'http://\' + window.location.host + \'/es-proxy\','
);

exports.init = function (opts) {
  opts = opts || {};
  var server = new DevServer();

  if (opts.useSauceLabs) {
    var connector = new Connector();
  }

  return server.listen()
  .then(function (port) {
    return wd.promiseChainRemote()
    .init({
      browserName: browserName || 'chrome',
      baseUrl: 'http://localhost:' + port
    });
  })
  .then(function (wd) {
    return {
      server: server,
      wd: wd,
      close: function () {
        return Promise.all([
          wd.close
          server.close()
        ]);
      }
    }
  });
};

exports.usingSauceLabs = function () {
  var server = new DevServer();


  var close = function () {
    return Promise.all([
      proxy.close(),
      connector.close(),
      server.close()
    ]);
  };

  return server.listen()
  .then(function (devServerPort) {
    return connector.listen()
  })
  .then(function () {

    });
  });
};