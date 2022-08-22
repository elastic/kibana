/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const toasts = getService('toasts');

  describe('text input', function testTextInput() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.closeHelpIfExists();
    });

    describe('load_from parameter', () => {
      it('should load the data from url', async () => {
        await PageObjects.common.navigateToApp('console', {
          hash: '#/console?load_from=https://www.elastic.co/guide/en/elasticsearch/reference/current/snippets/2199.console',
        });
        await retry.try(async () => {
          const request = await PageObjects.console.getRequest();
          log.debug(request);
          expect(request.trim()).to.eql('PUT /my-index-000001');
        });
      });

      it('should load the data from the data URI', async () => {
        await PageObjects.common.navigateToApp('console', {
          hash: '#/console?load_from=data:text/plain,BYUwNmD2Q',
        });

        await retry.try(async () => {
          const request = await PageObjects.console.getRequest();
          log.debug(request);
          expect(request.trim()).to.eql('hello');
        });
      });

      it('shows a toast error with invalid data', async () => {
        await PageObjects.common.navigateToApp('console', {
          hash: '#/console?load_from=data:text/plain,BYUwNmD2',
        });

        await retry.try(async () => {
          expect(await toasts.getToastCount()).to.equal(1);
        });
      });
    });

    describe('copy/pasting cURL', () => {
      const convertedRequest = `
      GET /_search
 {"query": {"match_all": {}}}
      `.trim();
      it("should automatically be converted into Console's request syntax", async () => {
        await PageObjects.console.clearTextArea();
        // Type curl request to copy in textarea
        await PageObjects.console.enterRequest(
          `\n curl -XGET "http://localhost:9200/_search" -d'\n{"query": {"match_all": {}}}'`
        );
        await PageObjects.console.copyText();
        await PageObjects.console.clearTextArea();
        await PageObjects.console.pasteText();
        await retry.try(async () => {
          const request = await PageObjects.console.getRequest();
          log.debug(request);
          expect(request).to.eql(convertedRequest);
        });
      });
    });
  });
}
