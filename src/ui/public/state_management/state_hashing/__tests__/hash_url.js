import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import { parse as parseUrl } from 'url';

import { StateProvider } from 'ui/state_management/state';
import { hashUrl } from 'ui/state_management/state_hashing';

describe('hashUrl', function () {
  let State;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject((Private, config) => {
    State = Private(StateProvider);
    sinon.stub(config, 'get').withArgs('state:storeInSessionStorage').returns(true);
  }));

  describe('throws error', () => {
    it('if states parameter is null', () => {
      expect(() => {
        hashUrl(null, '');
      }).to.throwError();
    });

    it('if states parameter is empty array', () => {
      expect(() => {
        hashUrl([], '');
      }).to.throwError();
    });
  });

  describe('does nothing', () => {
    let states;
    beforeEach(() => {
      states = [new State('testParam')];
    });
    it('if url is empty', () => {
      const url = '';
      expect(hashUrl(states, url)).to.be(url);
    });

    it('if just a host and port', () => {
      const url = 'https://localhost:5601';
      expect(hashUrl(states, url)).to.be(url);
    });

    it('if just a path', () => {
      const url = 'https://localhost:5601/app/kibana';
      expect(hashUrl(states, url)).to.be(url);
    });

    it('if just a path and query', () => {
      const url = 'https://localhost:5601/app/kibana?foo=bar';
      expect(hashUrl(states, url)).to.be(url);
    });

    it('if empty hash with query', () => {
      const url = 'https://localhost:5601/app/kibana?foo=bar#';
      expect(hashUrl(states, url)).to.be(url);
    });

    it('if query parameter matches and there is no hash', () => {
      const url = 'https://localhost:5601/app/kibana?testParam=(yes:!t)';
      expect(hashUrl(states, url)).to.be(url);
    });

    it(`if query parameter matches and it's before the hash`, () => {
      const url = 'https://localhost:5601/app/kibana?testParam=(yes:!t)';
      expect(hashUrl(states, url)).to.be(url);
    });

    it('if empty hash without query', () => {
      const url = 'https://localhost:5601/app/kibana#';
      expect(hashUrl(states, url)).to.be(url);
    });

    it('if empty hash without query', () => {
      const url = 'https://localhost:5601/app/kibana#';
      expect(hashUrl(states, url)).to.be(url);
    });

    it('if hash is just a path', () => {
      const url = 'https://localhost:5601/app/kibana#/discover';
      expect(hashUrl(states, url)).to.be(url);
    });

    it('if hash does not have matching query string vals', () => {
      const url = 'https://localhost:5601/app/kibana#/discover?foo=bar';
      expect(hashUrl(states, url)).to.be(url);
    });
  });

  describe('replaces querystring value with hash', () => {
    const getAppQuery = (url) => {
      const parsedUrl = parseUrl(url);
      const parsedAppUrl = parseUrl(parsedUrl.hash.slice(1), true);

      return parsedAppUrl.query;
    };

    it('if using a single State', () => {
      const stateParamKey = 'testParam';
      const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey}=(yes:!t)`;
      const mockHashedItemStore = {
        getItem: () => null,
        setItem: sinon.stub().returns(true)
      };
      const state = new State(stateParamKey, {}, mockHashedItemStore);

      const actualUrl = hashUrl([state], url);

      expect(mockHashedItemStore.setItem.calledOnce).to.be(true);

      const appQuery = getAppQuery(actualUrl);

      const hashKey = mockHashedItemStore.setItem.firstCall.args[0];
      expect(appQuery[stateParamKey]).to.eql(hashKey);
    });

    it('if using multiple States', () => {
      const stateParamKey1 = 'testParam1';
      const stateParamKey2 = 'testParam2';
      const url = `https://localhost:5601/app/kibana#/discover?foo=bar&${stateParamKey1}=(yes:!t)&${stateParamKey2}=(yes:!f)`;
      const mockHashedItemStore = {
        getItem: () => null,
        setItem: sinon.stub().returns(true)
      };
      const state1 = new State(stateParamKey1, {}, mockHashedItemStore);
      const state2 = new State(stateParamKey2, {}, mockHashedItemStore);

      const actualUrl = hashUrl([state1, state2], url);

      expect(mockHashedItemStore.setItem.calledTwice).to.be(true);

      const appQuery = getAppQuery(actualUrl);

      const hashKey1 = mockHashedItemStore.setItem.firstCall.args[0];
      const hashKey2 = mockHashedItemStore.setItem.secondCall.args[0];
      expect(appQuery[stateParamKey1]).to.eql(hashKey1);
      expect(appQuery[stateParamKey2]).to.eql(hashKey2);
    });
  });
});
