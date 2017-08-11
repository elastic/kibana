import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);
  const markdown = `
    # Heading 1
  `;

  describe('visualize app', async () => {
    before(async function () {
      await PageObjects.common.navigateToUrl('visualize', 'new');
      await PageObjects.visualize.clickMarkdownWidget();
      await PageObjects.visualize.setMarkdownTxt(markdown);
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('markdown vis', async () => {

      it('should render markdown as html', async function () {
        const h1Txt = await PageObjects.visualize.getMarkdownBodyDescendentText('h1');
        expect(h1Txt).to.equal('Heading 1');
      });
    });
  });
}
