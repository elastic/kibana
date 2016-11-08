import { bdd, defaultTimeout } from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('dismiss x-pack', function () {
  this.timeout = defaultTimeout;

  // Putting everything here in 'before' so it doesn't count as a test
  // since x-pack may or may not be installed.  We just want the banner closed.
  bdd.before(function () {
    PageObjects.common.debug('check for X-Pack welcome, opt-out, and dismiss it');
    // find class toaster and see if there's any list items in it?
    return PageObjects.settings.navigateTo()
    .then(() => {
      return PageObjects.monitoring.getToasterContents();
    })
    .then((contents) => {
      // Welcome to X-Pack!
      // Sharing your cluster statistics with us helps us improve. Your data is never shared with anyone. Not interested? Opt out here.
      // Dismiss
      PageObjects.common.debug('Toast banner contents = ' + contents);
      if (contents.includes('X-Pack')) {
        return PageObjects.monitoring.clickOptOut()
        .then(() => {
          return PageObjects.monitoring.dismissWelcome();
        });
      }
    });

  });

});
