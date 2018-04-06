// chrome expects to be loaded first, let it get its way
import chrome from 'ui/chrome';

import { parse as parseUrl } from 'url';
import sinon from 'sinon';
import { Notifier } from 'ui/notify';

import './test_harness.less';
import 'ng_mock';
import { setupTestSharding } from './test_sharding';

const { query } = parseUrl(window.location.href, true);
if (query && query.mocha) {
  try {
    window.mocha.setup(JSON.parse(query.mocha));
  } catch (error) {
    throw new Error(`'?mocha=${query.mocha}' query string param provided but it could not be parsed as json`);
  }
}

setupTestSharding();

// allows test_harness.less to have higher priority selectors
document.body.setAttribute('id', 'test-harness-body');

before(() => {
  // prevent accidental ajax requests
  sinon.useFakeXMLHttpRequest();
});

beforeEach(function () {
  // stub the UiSettingsClient
  if (chrome.getUiSettingsClient.restore) {
    chrome.getUiSettingsClient.restore();
  }

  const stubUiSettings = chrome.getUiSettingsClient().createStubForTests();
  sinon.stub(chrome, 'getUiSettingsClient', () => stubUiSettings);

  // ensure that notifications are not left in the notifiers
  if (Notifier.prototype._notifs.length) {
    const notifs = JSON.stringify(Notifier.prototype._notifs);
    Notifier.prototype._notifs.length = 0;
    throw new Error('notifications were left in the notifier: ' + notifs);
  }
});

// Kick off mocha, called at the end of test entry files
export function bootstrap() {
  chrome.setupAngular();
}
