import ngMock from 'ng_mock';
import sinon from 'sinon';
import expect from 'expect.js';
import Chance from 'chance';

import { Storage } from 'ui/storage';
import StubBrowserStorage from 'test_utils/stub_browser_storage';
import StubIndexPatternProvider from 'test_utils/stub_index_pattern';
import { UnsupportedTimePatternsProvider } from '../unsupported_time_patterns';

const MARKDOWN_LINK_RE = /\[(.+?)\]\((.+?)\)/;
const chance = new Chance();
const CONFIG_KEY = 'indexPatterns:warnAboutUnsupportedTimePatterns';

describe('warnAboutUnsupportedTimePattern()', () => {
  let setup;

  beforeEach(function () {
    setup = () => {
      const notify = { warning: sinon.stub() };
      const store = new StubBrowserStorage();
      const sessionStorage = new Storage(store);

      // stub some core services
      ngMock.module('kibana', $provide => {
        $provide.value('Notifier', function () { return notify; });
        $provide.value('sessionStorage', sessionStorage);
      });
      // trigger creation of the injector
      ngMock.inject();

      const { $injector } = this;
      const Private = $injector.get('Private');
      const StubIndexPattern = Private(StubIndexPatternProvider);
      const warnAboutUnsupportedTimePattern = Private(UnsupportedTimePatternsProvider);

      return {
        notify,
        store,
        config: $injector.get('config'),
        createIndexPattern: () => new StubIndexPattern(chance.word(), null, []),
        warnAboutUnsupportedTimePattern,
      };
    };
  });

  it('displays a warning with the id and edit url of the index pattern', () => {
    const {
      createIndexPattern,
      warnAboutUnsupportedTimePattern,
      notify
    } = setup();

    const indexPattern = createIndexPattern();
    warnAboutUnsupportedTimePattern(indexPattern);
    sinon.assert.calledOnce(notify.warning);

    const msg = notify.warning.firstCall.args[0];
    expect(msg)
      .to.contain(indexPattern.id)
      .and.to.match(MARKDOWN_LINK_RE);

    // link text
    expect(msg.match(MARKDOWN_LINK_RE)[1]).to.contain(indexPattern.id);

    // link url
    expect(msg.match(MARKDOWN_LINK_RE)[2])
      .to.contain('management/kibana/indices')
      .and.to.contain(encodeURIComponent(indexPattern.id));
  });

  it('only warns once per index pattern', () => {
    const {
      createIndexPattern,
      warnAboutUnsupportedTimePattern,
      notify,
    } = setup();

    const indexPattern1 = createIndexPattern();
    const indexPattern2 = createIndexPattern();

    warnAboutUnsupportedTimePattern(indexPattern1);
    sinon.assert.calledOnce(notify.warning);
    notify.warning.reset();

    warnAboutUnsupportedTimePattern(indexPattern1);
    sinon.assert.notCalled(notify.warning);

    warnAboutUnsupportedTimePattern(indexPattern2);
    sinon.assert.calledOnce(notify.warning);
    notify.warning.reset();

    warnAboutUnsupportedTimePattern(indexPattern1);
    sinon.assert.notCalled(notify.warning);

    warnAboutUnsupportedTimePattern(indexPattern2);
    sinon.assert.notCalled(notify.warning);

    warnAboutUnsupportedTimePattern(indexPattern1);
    sinon.assert.notCalled(notify.warning);
  });

  describe('ui config', () => {
    it('respects setting', () => {
      const {
        config,
        notify,
        warnAboutUnsupportedTimePattern,
        createIndexPattern,
      } = setup();

      config.set(CONFIG_KEY, false);
      warnAboutUnsupportedTimePattern(createIndexPattern());
      sinon.assert.notCalled(notify.warning);

      config.set(CONFIG_KEY, true);
      warnAboutUnsupportedTimePattern(createIndexPattern());
      sinon.assert.calledOnce(notify.warning);
    });
  });
});
