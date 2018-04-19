// chrome expects to be loaded first, let it get its way
import chrome from '../chrome';

import { parse as parseUrl } from 'url';
import sinon from 'sinon';
import { Notifier } from '../notify';
import { metadata } from '../metadata';
import { UiSettingsClient } from '../../ui_settings/public/ui_settings_client';

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


let stubUiSettings = new UiSettingsClient({
  defaults: metadata.uiSettings.defaults,
  initialSettings: {},
  notify: new Notifier({ location: 'Config' }),
  api: {
    batchSet() {
      return { settings: stubUiSettings.getAll() };
    }
  }
});
sinon.stub(chrome, 'getUiSettingsClient', () => stubUiSettings);

beforeEach(function () {
  // ensure that notifications are not left in the notifiers
  if (Notifier.prototype._notifs.length) {
    const notifs = JSON.stringify(Notifier.prototype._notifs);
    Notifier.prototype._notifs.length = 0;
    throw new Error('notifications were left in the notifier: ' + notifs);
  }
});

afterEach(function () {
  stubUiSettings = new UiSettingsClient({
    defaults: metadata.uiSettings.defaults,
    initialSettings: {},
    notify: new Notifier({ location: 'Config' }),
    api: {
      batchSet() {
        return { settings: stubUiSettings.getAll() };
      }
    }
  });
});

// Kick off mocha, called at the end of test entry files
export function bootstrap() {
  chrome.setupAngular();
}
