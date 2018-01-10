import expect from 'expect.js';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);
  const find = getService('find');
  const markdown = `
# Heading 1

<h3>Inline HTML that should not be rendered as html</h3>
  `;

  describe('visualize app', async () => {
    before(async function () {
      await PageObjects.common.navigateToUrl('visualize', 'new');
      await PageObjects.visualize.clickMarkdownWidget();
      await PageObjects.visualize.setMarkdownTxt(markdown);
      await PageObjects.visualize.clickGo();
    });

    describe('markdown vis', async () => {

      it('should not display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(false);
      });

      it('should render markdown as html', async function () {
        const h1Txt = await PageObjects.visualize.getMarkdownBodyDescendentText('h1');
        expect(h1Txt).to.equal('Heading 1');
      });

      it('should not render html in markdown as html', async function () {
        const expected = 'Heading 1\n<h3>Inline HTML that should not be rendered as html</h3>';
        const actual = await PageObjects.visualize.getMarkdownText();
        expect(actual).to.equal(expected);
      });

      it('should auto apply changes if auto mode is turned on', async function () {
        const markdown2 = '## Heading 2';
        await PageObjects.visualize.toggleAutoMode();
        await PageObjects.visualize.setMarkdownTxt(markdown2);
        await PageObjects.header.waitUntilLoadingHasFinished();
        const h1Txt = await PageObjects.visualize.getMarkdownBodyDescendentText('h2');
        expect(h1Txt).to.equal('Heading 2');
      });

      it('should resize the editor', async function () {
        const editorSidebar = await find.byCssSelector('.vis-editor-sidebar');
        const initialSize = await editorSidebar.getSize();
        await PageObjects.visualize.sizeUpEditor();
        const afterSize = await editorSidebar.getSize();
        expect(afterSize.width).to.be.greaterThan(initialSize.width);
      });
    });
  });
}
