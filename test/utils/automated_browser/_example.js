var wd = require('wd');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var asserters = wd.asserters;
var mocha = require('mocha');

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

var url = 'http://localhost:8000';
var access_key = '1770de66-20c2-4f3c-9d3e-3ecf01d768f4';
var username = 'ccowan';
var remotePort = (process.env.SAUCE) ? 4445 : 4444;

var options = {
  browserName: 'firefox',
  name: 'Example Marvel Test'
};

before(function (done) {
  this.browser = wd.promiseChainRemote('localhost', remotePort, username, access_key)
    .init(options)
    .then(function () { done(); });
});

after(function (done) {
  this.browser.quit()
    .then(function () { done(); });
});

describe('Welcome Screen', function () {
  describe('click "Continue Free Trial"', function() {

    beforeEach(function (done) {
      this.browser
        .get(url+'/kibana/index.html#/dashboard/elasticsearch/marvel.overview.json')
        .then(function () { done(); });
    });

    it('should set the marvelOpts trialTimestamp attribute in localStorage', function(done) {
      this.browser
        .waitForElementByCss('div > .modal-body > p > a:nth-child(3)', asserters.isDisplayed, 1000)
        .click()
        .waitForConditionInBrowser('JSON.parse(localStorage.getItem("marvelOpts")).status === "trial"', 1000)
        .then(function () { done(); });
    });

  });
});