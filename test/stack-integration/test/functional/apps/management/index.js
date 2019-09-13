import { bdd, defaultTimeout } from '../../../support';

bdd.describe('settings app', function () {
  this.timeout = defaultTimeout;

  // require('./_get_version_info');
  require('./_index_pattern_create_delete');

});
