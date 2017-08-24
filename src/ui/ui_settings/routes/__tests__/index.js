import {
  startServers,
  stopServers,
} from './lib';

import { docExistsSuite } from './doc_exists';
import { docMissingSuite } from './doc_missing';
import { indexMissingSuite } from './index_missing';

describe('uiSettings/routes', function () {
  this.slow(2000);
  this.timeout(10000);

  // these tests rely on getting sort of lucky with
  // the healthcheck, so we retry if they fail
  this.retries(3);

  before(startServers);
  describe('doc exists', docExistsSuite);
  describe('doc missing', docMissingSuite);
  describe('index missing', indexMissingSuite);
  after(stopServers);
});
