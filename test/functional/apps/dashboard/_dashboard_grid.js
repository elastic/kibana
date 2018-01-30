import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const find = getService('find');
  const remote = getService('remote');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);

  describe('dashboard grid', () => {

    before(async () => {
      return PageObjects.dashboard.initTests();
    });

    after(async () => {
      // avoids any 'Object with id x not found' errors when switching tests.
      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    describe('move panel', () => {
      // Specific test after https://github.com/elastic/kibana/issues/14764 fix
      it('Can move panel from bottom to top row', async () => {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.addVisualizations([
          PageObjects.dashboard.getTestVisualizationNames()[0],
          PageObjects.dashboard.getTestVisualizationNames()[1],
          PageObjects.dashboard.getTestVisualizationNames()[2],
        ]);

        const panels = await find.allByCssSelector('.panel-title');

        const thirdPanel = panels[2];
        const position1 = await thirdPanel.getPosition();

        remote
          .moveMouseTo(thirdPanel)
          .pressMouseButton()
          .moveMouseTo(null, -20, -400)
          .releaseMouseButton();

        const panelsMoved = await find.allByCssSelector('.panel-title');
        const position2 = await panelsMoved[2].getPosition();

        expect(position1.y).to.be.greaterThan(position2.y);
      });
    });

    describe('resize panel', () => {

      describe('input control panel', () => {

        before(async () => {
          await PageObjects.common.navigateToApp('dashboard');
          await PageObjects.dashboard.clickNewDashboard();
          await PageObjects.dashboard.addVisualizations(['Visualization InputControl']);
        });

        it('Should position controls in horizontal layout when panel is short and long', async () => {
          const resizeIcons = await find.allByCssSelector('.react-resizable-handle');
          expect(resizeIcons.length).to.equal(1);
          remote
            .moveMouseTo(resizeIcons[0])
            .pressMouseButton()
            .moveMouseTo(null, 300, 0)
            .releaseMouseButton();

          await retry.try(async () => {
            const controls = await testSubjects.findAll('inputControlItem');
            expect(controls.length).to.equal(3);
            const control0Position = await controls[0].getPosition();
            const control1Position = await controls[1].getPosition();
            const control2Position = await controls[2].getPosition();
            expect(control0Position.y).to.equal(control1Position.y);
            expect(control1Position.y).to.equal(control2Position.y);
          });
        });

        it('Should position controls in vertical layout when panel is tall and skinny', async () => {
          const resizeIcons = await find.allByCssSelector('.react-resizable-handle');
          expect(resizeIcons.length).to.equal(1);
          remote
            .moveMouseTo(resizeIcons[0])
            .pressMouseButton()
            .moveMouseTo(null, -400, 200)
            .releaseMouseButton();

          await retry.try(async () => {
            const controls = await testSubjects.findAll('inputControlItem');
            expect(controls.length).to.equal(3);
            const control0Position = await controls[0].getPosition();
            const control1Position = await controls[1].getPosition();
            const control2Position = await controls[2].getPosition();
            expect(control2Position.y).to.be.greaterThan(control1Position.y);
            expect(control1Position.y).to.be.greaterThan(control0Position.y);
          });

        });

        it('Should position controls inside panel', async () => {
          const controls = await testSubjects.findAll('inputControlItem');
          expect(controls.length).to.equal(3);
          const control0Size = await controls[0].getSize();
          const control1Size = await controls[1].getSize();
          const control2Size = await controls[2].getSize();

          const panels = await find.allByCssSelector('.dashboard-panel');
          expect(panels.length).to.equal(1);
          const panelSize = await panels[0].getSize();
          expect(control0Size.width).to.be.lessThan(panelSize.width);
          expect(control1Size.width).to.be.lessThan(panelSize.width);
          expect(control2Size.width).to.be.lessThan(panelSize.width);
        });
      });
    });
  });
}
