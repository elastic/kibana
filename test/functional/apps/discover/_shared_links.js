define(function (require) {
  var Common = require('../../../support/pages/common');
  var HeaderPage = require('../../../support/pages/header_page');
  var SettingsPage = require('../../../support/pages/settings_page');
  var DiscoverPage = require('../../../support/pages/discover_page');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('shared links', function describeIndexTests() {
      var common;
      var headerPage;
      var settingsPage;
      var discoverPage;
      var baseUrl;
      // The message changes for Firefox < 41 and Firefox >= 41
      // var expectedToastMessage = 'Share search: URL selected. Press Ctrl+C to copy.';
      // var expectedToastMessage = 'Share search: URL copied to clipboard.';
      // Pass either one.
      var expectedToastMessage = /Share search: URL (selected. Press Ctrl+C to copy.|copied to clipboard.)/;

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);

        baseUrl = common.getHostPort();

        var fromTime = '2015-09-19 06:31:44.000';
        var toTime = '2015-09-23 18:31:44.000';

        // start each test with an empty kibana index
        return scenarioManager.reload('emptyKibana')
        // and load a set of makelogs data
        .then(function loadIfEmptyMakelogs() {
          return scenarioManager.loadIfEmpty('logstashFunctional');
        })
        .then(function (navigateTo) {
          common.debug('navigateTo');
          return settingsPage.navigateTo();
        })
        .then(function () {
          common.debug('createIndexPattern');
          return settingsPage.createIndexPattern();
        })
        .then(function () {
          common.debug('discover');
          return common.navigateToApp('discover');
        })
        .then(function () {
          common.debug('setAbsoluteRange');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .catch(common.handleError(this));
      });


      bdd.describe('shared link', function () {

        bdd.it('should show "Share a link" caption', function () {
          var expectedCaption = 'Share a link';
          return discoverPage.clickShare()
          .then(function () {
            return discoverPage.getShareCaption();
          })
          .then(function (actualCaption) {
            expect(actualCaption).to.be(expectedCaption);
          })
          .catch(common.handleError(this));
        });


        bdd.it('should show the correct formatted URL', function () {
          var expectedUrl = baseUrl
            + '/app/kibana?_t=1453775307251#'
            + '/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time'
            + ':(from:\'2015-09-19T06:31:44.000Z\',mode:absolute,to:\'2015-09'
            + '-23T18:31:44.000Z\'))&_a=(columns:!(_source),index:\'logstash-'
            + '*\',interval:auto,query:(query_string:(analyze_wildcard:!t,query'
            + ':\'*\')),sort:!(\'@timestamp\',desc))';
          return discoverPage.getSharedUrl()
          .then(function (actualUrl) {
            // strip the timestamp out of each URL
            expect(actualUrl.replace(/_t=\d{13}/,'_t=TIMESTAMP'))

              .to.be(expectedUrl.replace(/_t=\d{13}/,'_t=TIMESTAMP'));
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show toast message for copy to clipboard', function () {
          return discoverPage.clickCopyToClipboard()
          .then(function () {
            return headerPage.getToastMessage();
          })
          .then(function (toastMessage) {
            expect(toastMessage).to.match(expectedToastMessage);
          })
          .then(function () {
            return headerPage.waitForToastMessageGone();
          })
          .catch(common.handleError(this));
        });

        // TODO: verify clipboard contents

        bdd.it('shorten URL button should produce a short URL', function () {
          var re = new RegExp(baseUrl + '/goto/[0-9a-f]{32}$');
          return discoverPage.clickShortenUrl()
          .then(function () {
            return common.tryForTime(20 * 1000, function tryingForTime() {
              return discoverPage.getShortenedUrl()
              .then(function (actualUrl) {
                expect(actualUrl).to.match(re);
              });
            });
          })
          .catch(common.handleError(this));
        });

        // NOTE: This test has to run immediately after the test above
        bdd.it('should show toast message for copy to clipboard', function () {
          return discoverPage.clickCopyToClipboard()
          .then(function () {
            return headerPage.getToastMessage();
          })
          .then(function (toastMessage) {
            expect(toastMessage).to.match(expectedToastMessage);
          })
          .then(function () {
            return headerPage.waitForToastMessageGone();
          })
          .catch(common.handleError(this));
        });


      });
    });
  };
});
