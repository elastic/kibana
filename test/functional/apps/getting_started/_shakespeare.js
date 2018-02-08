// import expect from 'expect.js';
import { spawn } from 'child_process';

export default function ({ getService, getPageObjects }) {
  // const kibanaServer = getService('kibanaServer');
  // const remote = getService('remote');
  const log = getService('log');
  // const retry = getService('retry');
  const PageObjects = getPageObjects(['console', 'common']);

  // https://www.elastic.co/guide/en/kibana/current/tutorial-load-dataset.html

  describe('Shakespeare', function describeIndexTests() {
    before(async function () {
      // delete .kibana index and then wait for Kibana to re-create it
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.collapseHelp();

      // this is just to set focus without messing up the default request
      await PageObjects.console.clickPlay();

      await PageObjects.common.sleep(1000);
      await PageObjects.console.setRequest('DELETE shakespeare');
      await PageObjects.common.sleep(1000);
      await PageObjects.console.clickPlay();
      await PageObjects.common.sleep(1000);
      // maybe we just ignore the response since it may or may not exist?
    });

    it('should set Shakespeare mapping', async function () {
      const mapping = 'PUT /shakespeare \n{\n "mappings": {\n "doc": {\n "properties": '
      + '{\n "speaker": {"type": "keyword"},\n  "play_name": {"type": "keyword"},\n '
      + '"line_id": {"type": "integer"},\n "speech_number": {"type": "integer"}';
      // log.debug('clearAceEditor');
      // await PageObjects.console.clearAceEditor();
      // await PageObjects.common.sleep(50000);
      await PageObjects.console.setRequest(mapping);
      // await PageObjects.common.sleep(10000);
      await PageObjects.console.clickPlay();
      await PageObjects.common.sleep(1000);
      const response = await PageObjects.console.getResponse();
      log.debug('response = ' + response);
      // expect(JSON.parse(response).acknowledged).to.be(true);

      // "acknowledged": true,
      // "shards_acknowledged": true,
      // "index": "shakespeare"
      // }');
      log.debug('run curl');
      //spawn('/bin/sh', [ '-c', 'curl -sSL https://get.rvm.io | bash -s stable --ruby' ])

      // const proc = spawn('curl', ['-H "Content-Type: application/x-ndjson" -XPOST "https://elastic:changeit@localhost:9200/shakespeare/doc/_bulk?pretty" --data-binary @shakespeare_6.0.json'], {
      const proc = spawn('/c/Program\ Files/Git/mingw64/bin/curl.exe', ['-H "Content-Type: application/x-ndjson" -XPOST "https://elastic:changeit@localhost:9200/shakespeare/doc/_bulk?pretty" --data-binary @shakespeare_6.0.json'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      await PageObjects.common.sleep(5000);
      proc.stdout.on('data', chunk => {
        log.debug('[chromedriver:stdout]', chunk.toString('utf8').trim());
      });
      proc.stderr.on('data', chunk => {
        log.debug('[chromedriver:stderr]', chunk.toString('utf8').trim());
      });
      log.debug('ran curl');
      await PageObjects.common.sleep(5000);


    });

    //curl -H 'Content-Type: application/x-ndjson' -XPOST 'localhost:9200/shakespeare/doc/_bulk?pretty' --data-binary @shakespeare_6.0.json


    //
    // spawn = require('child_process').spawn,
    // var ls  = spawn('ls', ['-l']);
    // ls.stdout.on('data', function (data) {
    //    console.log(data);
    // });
    // let proc = null;
    // proc.stdout.on('data', chunk => {
    //   log.debug('[chromedriver:stdout]', chunk.toString('utf8').trim());
    // });
    // proc.stderr.on('data', chunk => {
    //   log.debug('[chromedriver:stderr]', chunk.toString('utf8').trim());
    // });


    //
    //   it('should have index pattern in url', function url() {
    //     return retry.try(function tryingForTime() {
    //       return remote.getCurrentUrl()
    //         .then(function (currentUrl) {
    //           expect(currentUrl).to.contain(indexPatternId);
    //         });
    //     });
    //   });
    //
    //   it('should have expected table headers', function checkingHeader() {
    //     return PageObjects.settings.getTableHeader()
    //       .then(function (headers) {
    //         log.debug('header.length = ' + headers.length);
    //         const expectedHeaders = [
    //           'name',
    //           'type',
    //           'format',
    //           'searchable',
    //           'aggregatable',
    //           'excluded',
    //           'controls'
    //         ];
    //
    //         expect(headers.length).to.be(expectedHeaders.length);
    //
    //         const comparedHeaders = headers.map(function compareHead(header, i) {
    //           return header.getVisibleText()
    //             .then(function (text) {
    //               expect(text).to.be(expectedHeaders[i]);
    //             });
    //         });
    //
    //         return Promise.all(comparedHeaders);
    //       });
    //   });
    // });
    //
    // describe('index pattern deletion', function indexDelete() {
    //   before(function () {
    //     const expectedAlertText = 'Delete index pattern?';
    //     return PageObjects.settings.removeIndexPattern()
    //       .then(function (alertText) {
    //         expect(alertText).to.be(expectedAlertText);
    //       });
    //   });
    //
    //   it('should return to index pattern creation page', function returnToPage() {
    //     return retry.try(function tryingForTime() {
    //       return PageObjects.settings.getCreateIndexPatternGoToStep2Button();
    //     });
    //   });
    //
    //   it('should remove index pattern from url', function indexNotInUrl() {
    //     // give the url time to settle
    //     return retry.try(function tryingForTime() {
    //       return remote.getCurrentUrl()
    //         .then(function (currentUrl) {
    //           log.debug('currentUrl = ' + currentUrl);
    //           expect(currentUrl).to.not.contain('logstash-*');
    //         });
    //     });
    //   });
    // });
  });
}
