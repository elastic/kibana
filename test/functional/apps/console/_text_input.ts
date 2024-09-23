/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const RESTORE_AND_EXECUTE = true;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const toasts = getService('toasts');
  const PageObjects = getPageObjects(['common', 'console', 'header']);

  describe('text input', function testTextInput() {
    before(async () => {
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.skipTourIfExists();
    });

    beforeEach(async () => {
      await PageObjects.console.openConsole();
      await PageObjects.console.skipTourIfExists();
      await PageObjects.console.clearEditorText();
    });

    describe('with a data URI in the load_from query', () => {
      it('loads the data from the URI', async () => {
        await PageObjects.common.navigateToApp('console', {
          hash: '#/console?load_from=data:text/plain,BYUwNmD2Q',
        });

        await retry.try(async () => {
          const actualRequest = await PageObjects.console.getEditorText();
          expect(actualRequest.trim()).to.eql('hello');
        });
      });

      describe('with invalid data', () => {
        it('shows a toast error', async () => {
          await PageObjects.common.navigateToApp('console', {
            hash: '#/console?load_from=data:text/plain,BYUwNmD2',
          });

          await retry.try(async () => {
            expect(await toasts.getCount()).to.equal(1);
          });
        });
      });
    });

    // not yet implemented for monaco https://github.com/elastic/kibana/issues/186001
    describe.skip('copy/pasting cURL commands into the console', () => {
      it('should convert cURL commands into the console request format', async () => {
        await PageObjects.console.enterText(
          `\n curl -XGET "http://localhost:9200/_search?pretty" -d'\n{"query": {"match_all": {}}}'`
        );
        await PageObjects.console.copyRequestsToClipboard();
        await PageObjects.console.clearEditorText();
        await PageObjects.console.pasteClipboardValue();
        await retry.try(async () => {
          const actualRequest = await PageObjects.console.getEditorText();
          expect(actualRequest.trim()).to.eql('GET /_search?pretty\n {"query": {"match_all": {}}}');
        });
      });
    });

    describe('console history', () => {
      const sendRequest = async (request: string) => {
        await PageObjects.console.enterText(request);
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();
      };

      it('should show the history', async () => {
        await sendRequest('GET /_search?pretty');
        await PageObjects.console.openHistory();
        await PageObjects.header.waitUntilLoadingHasFinished();

        await retry.try(async () => {
          const history = await PageObjects.console.getHistoryEntries();
          expect(history).to.eql(['/_search?pretty\na few seconds ago']);
        });

        await PageObjects.console.clickClearHistory();
      });

      it('should load a request from history', async () => {
        await sendRequest('GET _search\n{"query": {"match_all": {}}}');
        await PageObjects.console.clearEditorText();

        await PageObjects.console.openHistory();
        await PageObjects.console.loadRequestFromHistory(0);

        await retry.try(async () => {
          const actualRequest = await PageObjects.console.getEditorText();
          expect(actualRequest.trim()).to.contain(
            'GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}'
          );
        });
      });

      it('can restore and execute a request from history', async () => {
        await sendRequest('GET _search\n{"query": {"match_all": {}}}');
        await PageObjects.console.clearEditorText();

        await PageObjects.console.openHistory();
        await PageObjects.console.loadRequestFromHistory(0, RESTORE_AND_EXECUTE);

        await retry.try(async () => {
          const output = await PageObjects.console.getOutputText();
          expect(output).to.contain('successful');
        });
      });
    });
  });
}
