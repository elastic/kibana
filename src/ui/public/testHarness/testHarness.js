/* global mocha */

// chrome expects to be loaded first, let it get its way
let chrome = require('ui/chrome');

let Nonsense = require('Nonsense');
let sinon = require('sinon');
let $ = require('jquery');
let _ = require('lodash');
let parse = require('url').parse;

let StackTraceMapper = require('ui/StackTraceMapper');

/*** the vislib tests have certain style requirements, so lets make sure they are met ***/
$('body').attr('id', 'test-harness-body'); // so we can make high priority selectors
require('./testHarness.less');


/*** Setup seeded random ***/
let seedInput = parse(window.location.href, true).query.seed;
let seed = _.add(seedInput, 0) || Date.now();
Math.random = _.bindKey(new Nonsense(seed), 'frac');
Math.random.nonsense = new Nonsense(seed);
console.log('Random-ness seed: ' + seed);


/*** Setup auto releasing stubs and spys ***/
require('auto-release-sinon').setupAutoRelease(sinon, window.afterEach);


/*** Make sure that angular-mocks gets setup in the global suite **/
require('ngMock');


/*** manually map error stack traces using the sourcemap ***/
before(function () {
  // before the tests start, load the sourcemap and hook into error generation for the mocha reporter
  this.timeout(30000);

  let mapper;
  let Runner = window.Mocha.Runner;

  Runner.prototype.emit = _.wrap(Runner.prototype.emit, function (emit, event, test, err) {
    if (err && mapper) err = mapper.mapError(err);
    return emit.call(this, event, test, err);
  });

  return StackTraceMapper.getInstance({
    '/bundles/tests.bundle.js': '/bundles/tests.bundle.js.map'
  }).then(function (instance) {
    mapper = instance;
  });
});


before(function () {
  sinon.useFakeXMLHttpRequest();
});


/*** Kick off mocha, called at the end of test entry files ***/
exports.bootstrap = function () {
  chrome.setupAngular();
};
