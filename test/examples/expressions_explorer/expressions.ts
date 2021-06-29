/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import testSubjSelector from '@kbn/test-subj-selector';
import { PluginFunctionalProviderContext } from 'test/plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');

  describe('', () => {
    it('runs expression', async () => {
      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('expressionResult');
        expect(text).to.be(
          '{\n "type": "render",\n "as": "markdown",\n "value": {\n  "content": "## expressions explorer",\n  "font": {\n   "type": "style",\n   "spec": {\n    "fontFamily": "\'Open Sans\', Helvetica, Arial, sans-serif",\n    "fontWeight": "normal",\n    "fontStyle": "normal",\n    "textDecoration": "none",\n    "textAlign": "left",\n    "fontSize": "14px",\n    "lineHeight": "1"\n   },\n   "css": "font-family:\'Open Sans\', Helvetica, Arial, sans-serif;font-weight:normal;font-style:normal;text-decoration:none;text-align:left;font-size:14px;line-height:1"\n  },\n  "openLinksInNewTab": false\n }\n}'
        );
      });
    });

    it('renders expression', async () => {
      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('expressionRender');
        expect(text).to.be('expressions explorer rendering');
      });
    });

    it('updates the variable', async () => {
      const selector = `${testSubjSelector('expressionsVariablesTest')} ${testSubjSelector(
        'testExpressionButton'
      )}`;
      await find.clickByCssSelector(selector);
      await retry.try(async () => {
        const el = await find.byCssSelector(selector);
        const style = await el.getAttribute('style');
        expect(style).to.contain('red');
      });
    });

    it('emits an action and navigates', async () => {
      const selector = `${testSubjSelector('expressionsActionsTest')} ${testSubjSelector(
        'testExpressionButton'
      )}`;
      await find.clickByCssSelector(selector);
      await retry.try(async () => {
        const text = await browser.getCurrentUrl();
        expect(text).to.be('https://www.google.com/?gws_rd=ssl');
      });
    });
  });
}
