import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'header']);
  const dashboardExpect = getService('dashboardExpect');
  const remote = getService('remote');
  let kibanaBaseUrl;

  describe('bwc shared urls', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();

      const currentUrl = await remote.getCurrentUrl();
      kibanaBaseUrl = currentUrl.substring(0, currentUrl.indexOf('#'));
    });

    describe('6.0 urls', () => {
      it('loads an unsaved dashboard', async function () {
        const url = `${kibanaBaseUrl}#/dashboard?` +
          `_g=(refreshInterval:(display:Off,pause:!f,value:0),` +
              `time:(from:'2012-11-17T00:00:00.000Z',mode:absolute,to:'2015-11-17T18:01:36.621Z'))&` +
          `_a=(description:'',filters:!(),` +
              `fullScreenMode:!f,` +
              `options:(darkTheme:!f),` +
              `panels:!((col:1,id:Visualization-MetricChart,panelIndex:1,row:1,size_x:6,size_y:3,type:visualization),` +
                       `(col:7,id:Visualization-PieChart,panelIndex:2,row:1,size_x:6,size_y:3,type:visualization)),` +
              `query:(language:lucene,query:'memory:%3E220000'),` +
              `timeRestore:!f,` +
              `title:'New+Dashboard',` +
              `uiState:(P-1:(vis:(defaultColors:('0+-+100':'rgb(0,104,55)'))),` +
                       `P-2:(vis:(colors:('200,000':%23F9D9F9,` +
                                         `'240,000':%23F9D9F9,` +
                                         `'280,000':%23F9D9F9,` +
                                         `'320,000':%23F9D9F9,` +
                                         `'360,000':%23F9D9F9),` +
                                  `legendOpen:!t))),` +
              `viewMode:edit)`;

        await remote.get(url, true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const query = await PageObjects.dashboard.getQuery();
        expect(query).to.equal('memory:>220000');

        await dashboardExpect.pieSliceCount(5);
        await dashboardExpect.panelCount(2);
        await dashboardExpect.selectedLegendColorCount('#F9D9F9', 5);
      });
    });
  });
}
