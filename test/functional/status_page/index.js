import {
  bdd,
  common
} from '../../support';

var expect = require('expect.js');

bdd.describe('status page', function () {
  bdd.before(function () {
    return common.navigateToApp('status_page', false);
  });

  bdd.it('should show the kibana plugin as ready', function () {
    var self = this;

    return common.tryForTime(6000, function () {
      return common.findTestSubject('statusBreakdown')
      .getVisibleText()
      .then(function (text) {
        common.saveScreenshot('Status');
        expect(text.indexOf('plugin:kibana')).to.be.above(-1);
      });
    })
    .catch(common.createErrorHandler(self));
  });
});
