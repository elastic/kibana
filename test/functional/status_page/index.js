import {
  bdd,
} from '../../support';

import PageObjects from '../../support/page_objects';

var expect = require('expect.js');

bdd.describe('status page', function () {
  bdd.before(function () {
    return PageObjects.common.navigateToApp('status_page', false);
  });

  bdd.it('should show the kibana plugin as ready', function () {
    var self = this;

    return PageObjects.common.tryForTime(6000, function () {
      return PageObjects.common.findTestSubject('statusBreakdown')
      .getVisibleText()
      .then(function (text) {
        PageObjects.common.saveScreenshot('Status');
        expect(text.indexOf('plugin:kibana')).to.be.above(-1);
      });
    })
    .catch(PageObjects.common.createErrorHandler(self));
  });
});
