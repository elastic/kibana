import { bdd, defaultTimeout } from '../../../support';

bdd.describe('users app', function () {
  this.timeout = defaultTimeout;

  require('./_users');
  require('./_secure_roles_perm');
  require('./_roles_dls');
  require('./_roles_fls');
});
