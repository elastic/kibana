import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'auto-release-sinon';

import StateProvider from 'ui/state_management/state';
import { UnhashStatesProvider } from 'ui/state_management/unhash_states';

describe('State Management Unhash States', () => {
  let setup;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(Private => {
    setup = () => {
      const unhashStates = Private(UnhashStatesProvider);

      const State = Private(StateProvider);
      const testState = new State('testParam');
      sinon.stub(testState, 'translateHashToRison').withArgs('hash').returns('replacement');

      return { unhashStates, testState };
    };
  }));

  describe('#inAbsUrl()', () => {
    it('does nothing if missing input', () => {
      const { unhashStates } = setup();
      expect(() => {
        unhashStates.inAbsUrl();
      }).to.not.throwError();
    });

    it('does nothing if just a host and port', () => {
      const { unhashStates } = setup();
      const url = 'https://localhost:5601';
      expect(unhashStates.inAbsUrl(url)).to.be(url);
    });

    it('does nothing if just a path', () => {
      const { unhashStates } = setup();
      const url = 'https://localhost:5601/app/kibana';
      expect(unhashStates.inAbsUrl(url)).to.be(url);
    });

    it('does nothing if just a path and query', () => {
      const { unhashStates } = setup();
      const url = 'https://localhost:5601/app/kibana?foo=bar';
      expect(unhashStates.inAbsUrl(url)).to.be(url);
    });

    it('does nothing if empty hash with query', () => {
      const { unhashStates } = setup();
      const url = 'https://localhost:5601/app/kibana?foo=bar#';
      expect(unhashStates.inAbsUrl(url)).to.be(url);
    });

    it('does nothing if empty hash without query', () => {
      const { unhashStates } = setup();
      const url = 'https://localhost:5601/app/kibana#';
      expect(unhashStates.inAbsUrl(url)).to.be(url);
    });

    it('does nothing if empty hash without query', () => {
      const { unhashStates } = setup();
      const url = 'https://localhost:5601/app/kibana#';
      expect(unhashStates.inAbsUrl(url)).to.be(url);
    });

    it('does nothing if hash is just a path', () => {
      const { unhashStates } = setup();
      const url = 'https://localhost:5601/app/kibana#/discover';
      expect(unhashStates.inAbsUrl(url)).to.be(url);
    });

    it('does nothing if hash does not have matching query string vals', () => {
      const { unhashStates } = setup();
      const url = 'https://localhost:5601/app/kibana#/discover?foo=bar';
      expect(unhashStates.inAbsUrl(url)).to.be(url);
    });

    it('replaces query string vals in hash for matching states with output of state.toRISON()', () => {
      const { unhashStates, testState } = setup();
      const url = 'https://localhost:5601/#/?foo=bar&testParam=hash';
      const exp = 'https://localhost:5601/#/?foo=bar&testParam=replacement';
      expect(unhashStates.inAbsUrl(url, [testState])).to.be(exp);
    });
  });
});
