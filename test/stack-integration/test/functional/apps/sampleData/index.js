
import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('sample data', function () {

  bdd.before(function () {
    return PageObjects.remote.setWindowSize(1200,800);
  });

  require('./_eCommerce');
});
