/* jshint node:true */
var _ = require('lodash');
var Proxy = require('./test/utils/proxy');
var Promise = require('bluebird');
var readFileSync = require('fs').readFileSync;
var rel = require('path').join.bind(null, __dirname);


var soda = require('soda');
var expect = require('chai').expect;

// array of async fns that will be called when we need to close up
var closers = [];

connectSauceLabs({
  username: SAUCE_USERNAME,
  accessKey: SAUCE_ACCESSKEY,
  verbose: true,
  //optionally change sauce connect logfile location
  logfile: null,
  // optionally identity the tunnel for concurrent tunnels
  tunnelIdentifier: null,
  logger: function () {
    console.log(' \x1b[33mSauce Connect\x1b[0m: %s', [].join.call(arguments, ', '));
  }
})
.then(function (connectProc) {
  closers.push(function () {
    return Promise.promisify(connectProc.close, connectProc)()
    .then(console.log.bind(console, 'Closed Sauce Connect'));
  });

  console.log('Started Sauce Connect');
})
.then(function () {
  var browser = soda.createSauceClient({
    'url': 'http://localhost:8000',
    'username': SAUCE_USERNAME,
    'access-key': SAUCE_ACCESSKEY,
    'os': 'Windows 2003',
    'browser': 'firefox',
    'browser-version': '7',
    'name': 'This is an example test'
  });

  browser.on('command', function(cmd, args){
    console.log(' \x1b[33m%s\x1b[0m: %s', cmd, args.join(', '));
  });

  browser
    .chain
    .session()
    .open('/src/#/visualize')
    .waitForPageToLoad(8000)
    .select('//ng-model="indexPattern.selection"')
    .end(function(err){
      this.queue = null;
      this.setContext('sauce:job-info={"passed": ' + (err === null) + '}', function(){
        browser.testComplete(function(){
          if (err) throw err;
        });
      });

      Promise.all(closers.map(function (fn) { return fn(); }));
    });
});