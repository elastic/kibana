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
  const PageObjects = getPageObjects(['visualize', 'visEditor', 'visChart', 'header']);
  const find = getService('find');
  const inspector = getService('inspector');
  const markdown = `
# Heading 1

<h3>Inline HTML that should not be rendered as html</h3>
  `;

  describe('markdown app in visualize app', () => {
    before(async function () {
      await PageObjects.visualize.initTests();
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickMarkdownWidget();
      await PageObjects.visEditor.setMarkdownTxt(markdown);
      await PageObjects.visEditor.clickGo();
    });

    describe('markdown vis', () => {
      it('should not have inspector enabled', async function () {
        await inspector.expectIsNotEnabled();
      });

      it('should render markdown as html', async function () {
        const h1Txt = await PageObjects.visChart.getMarkdownBodyDescendentText('h1');
        expect(h1Txt).to.equal('Heading 1');
      });

      it('should not render html in markdown as html', async function () {
        const expected = 'Heading 1\n<h3>Inline HTML that should not be rendered as html</h3>';
        const actual = await PageObjects.visChart.getMarkdownText();
        expect(actual).to.equal(expected);
      });

      it('should auto apply changes if auto mode is turned on', async function () {
        const markdown2 = '## Heading 2';
        await PageObjects.visEditor.toggleAutoMode();
        await PageObjects.visEditor.setMarkdownTxt(markdown2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        const h1Txt = await PageObjects.visChart.getMarkdownBodyDescendentText('h2');
        expect(h1Txt).to.equal('Heading 2');
      });

      it('should resize the editor', async function () {
        const editorSidebar = await find.byCssSelector('.visEditor__collapsibleSidebar');
        const initialSize = await editorSidebar.getSize();
        await PageObjects.visEditor.sizeUpEditor();
        const afterSize = await editorSidebar.getSize();
        expect(afterSize.width).to.be.greaterThan(initialSize.width);
      });
    });
  });
}
