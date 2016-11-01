// chrome expects to be loaded first, let it get its way
import chrome from 'ui/chrome';

import sinon from 'sinon';
import Notifier from 'ui/notify/notifier';
import { setupAutoRelease } from 'auto-release-sinon';

import './test_harness.less';
import 'ng_mock';
import { setupTestSharding } from './test_sharding';

// Setup auto releasing stubs and spys
setupAutoRelease(sinon, window.afterEach);
setupTestSharding();

// allows test_harness.less to have higher priority selectors
document.body.setAttribute('id', 'test-harness-body');

// prevent accidental ajax requests
before(() => {
  sinon.useFakeXMLHttpRequest();
});

beforeEach(function () {
  if (Notifier.prototype._notifs.length) {
    Notifier.prototype._notifs.length = 0;
    throw new Error('notifications were left in the notifier');
  }
});

// Kick off mocha, called at the end of test entry files
exports.bootstrap = () => {
  chrome.setupAngular();
};
