import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', () => {
    before(async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickVega');
      await PageObjects.visualize.clickVega();
    });

    describe('vega chart', () => {
      it('should not display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(false);
      });

      it('should have some initial vega spec text', async function () {
        const vegaSpec = await PageObjects.visualize.getVegaSpec();
        expect(vegaSpec).to.contain('{').and.to.contain('data');
        expect(vegaSpec.length).to.be.above(500);
      });

      it('should have view and control containers', async function () {
        const view = await PageObjects.visualize.getVegaViewContainer();
        expect(view).to.be.ok();
        const size = await view.getSize();
        expect(size).to.have.property('width').and.to.have.property('height');
        expect(size.width).to.be.above(0);
        expect(size.height).to.be.above(0);

        const controls = await PageObjects.visualize.getVegaControlContainer();
        expect(controls).to.be.ok();
      });

    });
  });
}
