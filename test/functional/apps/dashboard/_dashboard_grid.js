import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const find = getService('find');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);

  const VIS_TITLES = [
    PageObjects.dashboard.getTestVisualizationNames()[0],
    PageObjects.dashboard.getTestVisualizationNames()[1],
    PageObjects.dashboard.getTestVisualizationNames()[2],
  ];

  // Order returned by find.allByCssSelector is not guaranteed and can change based on timing
  // Use this function to avoid looking for elements by hard-coded array index.
  const getPanelTitleElement = async (title) => {
    const panelTitleElements = await find.allByCssSelector('.panel-title');
    for (let i = 0; i < panelTitleElements.length; i++) {
      const panelText = await panelTitleElements[i].getVisibleText();
      if (panelText === title) {
        return panelTitleElements[i];
      }
    }

    throw new Error(`Unable to find panel with title: "${title}"`);
  };

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
        await PageObjects.dashboard.addVisualizations(VIS_TITLES);

        const lastVisTitle = VIS_TITLES[VIS_TITLES.length - 1];

        const panelTitleBeforeMove = await getPanelTitleElement(lastVisTitle);
        const position1 = await panelTitleBeforeMove.getPosition();

        remote
          .moveMouseTo(panelTitleBeforeMove)
          .pressMouseButton()
          .moveMouseTo(null, -20, -450)
          .releaseMouseButton();

        const panelTitleAfterMove = await getPanelTitleElement(lastVisTitle);
        const position2 = await panelTitleAfterMove.getPosition();

        expect(position1.y).to.be.greaterThan(position2.y);
      });
    });
  });
}
