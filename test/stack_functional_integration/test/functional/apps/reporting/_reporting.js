
import expect from 'expect.js';

import {
  bdd,
  config
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('reporting app', function describeIndexTests() {

  const visName1 = 'Connections over time';

  bdd.before(function () {
    PageObjects.common.debug('navigateToApp visualize');
    return PageObjects.common.navigateToApp('visualize')
    .then(() => {
      return PageObjects.visualize.openSavedVisualization(visName1);
    })
    .then(() => {
      return PageObjects.common.sleep(3000);
    });
  });

  bdd.it('should show toast messages when report is queued', () => {
    const reportQueued = 'Reporting: Visualization generation has been queued. You can track its progress under Management.';
    PageObjects.common.debug('click Reporting button');
    return PageObjects.header.clickReporting()
    .then(() => {
      // PageObjects.common.saveScreenshot('Reportingstep-1');
      PageObjects.common.debug('click Printable PDF');
      return PageObjects.header.clickPrintablePdf();
    })
    .then(() => {
      // PageObjects.common.saveScreenshot('Reporting-step-2');
      return PageObjects.header.getToastMessage();
    })
    .then((message1) => {
      expect(message1).to.be(reportQueued);
      return PageObjects.header.waitForToastMessageGone();
    });
  });


  bdd.it('should show toast messages when report is ready', () => {
    const reportReady = 'Your report for the "' + visName1 + '" visualization is ready! Pick it up from Management > Kibana > Reporting';
    PageObjects.common.debug('get Report ready Notification');
    return PageObjects.common.try(() => {
      return PageObjects.header.getToastMessage();
    })
    .then((message2) => {
      // PageObjects.common.saveScreenshot('Reporting-step-3');
      expect(message2).to.be(reportReady);
      PageObjects.common.debug('click OK in Notification');
      return PageObjects.header.clickToastOK();
    });
  });


  bdd.it('Management - Reporting - should show completed message', () => {
    return PageObjects.settings.navigateTo()
    .then(() => {
      return PageObjects.settings.clickKibanaReporting();
    })
    .then(() => {
      return PageObjects.common.try(() => {
        return PageObjects.settings.getLatestReportingJob()
        .then((data1) => {
          expect(data1.queryName).to.be(visName1);
          expect(data1.type).to.be('visualization');
          expect(data1.username).to.be(config.servers.kibana.username);
          expect(data1.status).to.be('completed');
        });
      });
    });
    PageObjects.common.saveScreenshot('Reporting-step-4');
  });

  bdd.it('Management - Reporting - click the button should download the PDF', () => {
    let windowHandles;
    return PageObjects.settings.clickDownloadPdf()
    .then(() => {
      return PageObjects.common.sleep(5000);
    })
    .then(() => {
      return this.remote.getAllWindowHandles();
    })
    .then((handles) => {
      windowHandles = handles;
      this.remote.switchToWindow(windowHandles[1]);
    })
    .then(() => {
      this.remote.getCurrentWindowHandle();
    })
    .then(() => {
      PageObjects.common.saveScreenshot('Reporting-PDF');
    })
    .then(() => {
      return this.remote.getCurrentUrl();
    })
    .then((url) => {
      PageObjects.common.debug('URL = ' + url);
      expect(url).to.contain('/jobs/download/');
    });
  });

});
