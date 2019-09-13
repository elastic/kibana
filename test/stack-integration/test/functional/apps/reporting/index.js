
import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('reporting app', function () {

  bdd.before(function () {
    return PageObjects.remote.setWindowSize(1200,800);
  });

  // require('./_reporting');  //currently broke in 6.6 because you have to save the visualization before you can pdf it
  require('./reporting_watcher_png');
  require('./reporting_watcher');
});
