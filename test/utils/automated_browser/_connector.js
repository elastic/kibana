var Promise = require('bluebird');
var connectSauceLabs = Promise.promisify(require('sauce-connect-launcher'));

var creds = require('../../../.creds');

module.exports = function SauceLabsConnector() {
  var proc;

  var pickPort = function () {
    return new Promise(function (resolve, reject) {
      var server = require('http').createServer();
      server.listen(0, function () {
        var port = server.address().port;
        server.once('close', function () {
          resolve(port);
        });
        server.close();
      });
    });
  };

  this.listen = function () {
    connectSauceLabs({
      username: creds.SAUCE_USERNAME,
      accessKey: creds.SAUCE_ACCESSKEY,
      verbose: true,
      tunnelIdentifier: null,
      logger: function () {
        console.log(' \x1b[33mSauce Connect\x1b[0m: %s', [].join.call(arguments, ', '));
      }
    })
    .then(function (connectProc) {
      proc = connectProc;
      return proc;
    });
  };

  this.close = function () {

  };
};