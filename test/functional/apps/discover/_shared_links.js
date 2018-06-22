import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'header']);

  describe('shared links', function describeIndexTests() {
    let baseUrl;

    before(async function () {
      baseUrl = PageObjects.common.getHostPort();
      log.debug('baseUrl = ' + baseUrl);
      // browsers don't show the ':port' if it's 80 or 443 so we have to
      // remove that part so we can get a match in the tests.
      baseUrl = baseUrl.replace(':80', '').replace(':443', '');
      log.debug('New baseUrl = ' + baseUrl);

      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        defaultIndex: 'logstash-*',
      });

      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      await esArchiver.loadIfNeeded('logstash_functional');

      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');

      log.debug('setAbsoluteRange');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);

      //After hiding the time picker, we need to wait for
      //the refresh button to hide before clicking the share button
      return PageObjects.common.sleep(1000);
    });

    describe('shared link', function () {
      it('should show "Share a link" caption', async function () {
        const expectedCaption = 'Share saved';

        await PageObjects.discover.clickShare();
        const actualCaption = await PageObjects.discover.getShareCaption();

        expect(actualCaption).to.contain(expectedCaption);
      });

      it('should show the correct formatted URL', async function () {
        const expectedUrl =
          baseUrl +
          '/app/kibana?_t=1453775307251#' +
          '/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time' +
          ':(from:\'2015-09-19T06:31:44.000Z\',mode:absolute,to:\'2015-09' +
          '-23T18:31:44.000Z\'))&_a=(columns:!(_source),index:\'logstash-' +
          '*\',interval:auto,query:(language:lucene,query:\'\')' +
          ',sort:!(\'@timestamp\',desc))';
        const actualUrl = await PageObjects.discover.getSharedUrl();
        // strip the timestamp out of each URL
        expect(actualUrl.replace(/_t=\d{13}/, '_t=TIMESTAMP')).to.be(
          expectedUrl.replace(/_t=\d{13}/, '_t=TIMESTAMP')
        );
      });

      it('gets copied to clipboard', async function () {
        const isCopiedToClipboard = await PageObjects.discover.clickCopyToClipboard();
        expect(isCopiedToClipboard).to.eql(true);
      });

      // TODO: verify clipboard contents
      it('shorten URL button should produce a short URL', async function () {
        const re = new RegExp(baseUrl + '/goto/[0-9a-f]{32}$');
        await PageObjects.discover.clickShortenUrl();
        await retry.try(async function tryingForTime() {
          const actualUrl = await PageObjects.discover.getSharedUrl();
          expect(actualUrl).to.match(re);
        });
      });

      // NOTE: This test has to run immediately after the test above
      it('copies short URL to clipboard', async function () {
        const isCopiedToClipboard = await PageObjects.discover.clickCopyToClipboard();
        expect(isCopiedToClipboard).to.eql(true);
      });
    });
  });
}
