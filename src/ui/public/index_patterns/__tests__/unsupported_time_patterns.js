import ngMock from 'ng_mock';
import expect from 'expect.js';
import Chance from 'chance';

import { Storage } from '../../storage';
import StubBrowserStorage from 'test_utils/stub_browser_storage';
import StubIndexPatternProvider from 'test_utils/stub_index_pattern';
import { IsUserAwareOfUnsupportedTimePatternProvider } from '../unsupported_time_patterns';

const chance = new Chance();
const CONFIG_KEY = 'indexPatterns:warnAboutUnsupportedTimePatterns';

describe('isUserAwareOfUnsupportedTimePattern()', () => {
  let setup;

  beforeEach(function () {
    setup = () => {
      const store = new StubBrowserStorage();
      const sessionStorage = new Storage(store);

      // stub some core services
      ngMock.module('kibana', $provide => {
        $provide.value('sessionStorage', sessionStorage);
      });
      // trigger creation of the injector
      ngMock.inject();

      const { $injector } = this;
      const Private = $injector.get('Private');
      const StubIndexPattern = Private(StubIndexPatternProvider);
      const isUserAwareOfUnsupportedTimePattern = Private(IsUserAwareOfUnsupportedTimePatternProvider);

      const config = $injector.get('config');
      config.set(CONFIG_KEY, true); // enable warnings

      return {
        config,
        createIndexPattern: () => new StubIndexPattern(chance.word(), null, []),
        isUserAwareOfUnsupportedTimePattern,
      };
    };
  });

  it('only warns once per index pattern', () => {
    const {
      createIndexPattern,
      isUserAwareOfUnsupportedTimePattern,
    } = setup();

    const indexPattern1 = createIndexPattern();
    const indexPattern2 = createIndexPattern();

    expect(isUserAwareOfUnsupportedTimePattern(indexPattern1)).to.be(false);
    expect(isUserAwareOfUnsupportedTimePattern(indexPattern1)).to.be(true);
    expect(isUserAwareOfUnsupportedTimePattern(indexPattern2)).to.be(false);
    expect(isUserAwareOfUnsupportedTimePattern(indexPattern1)).to.be(true);
    expect(isUserAwareOfUnsupportedTimePattern(indexPattern2)).to.be(true);
    expect(isUserAwareOfUnsupportedTimePattern(indexPattern1)).to.be(true);
  });

  describe('ui config', () => {
    it('respects setting', () => {
      const {
        config,
        isUserAwareOfUnsupportedTimePattern,
        createIndexPattern,
      } = setup();

      config.set(CONFIG_KEY, false);
      expect(isUserAwareOfUnsupportedTimePattern(createIndexPattern())).to.be(true);

      config.set(CONFIG_KEY, true);
      expect(isUserAwareOfUnsupportedTimePattern(createIndexPattern())).to.be(false);
    });
  });
});
