import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

import { StateProvider } from 'ui/state_management/state';
import { unhashUrl } from 'ui/state_management/state_hashing';

describe('unhashUrl', () => {
  let unhashableStates;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(Private => {
    const State = Private(StateProvider);
    const unhashableState = new State('testParam');
    sinon.stub(unhashableState, 'translateHashToRison').withArgs('hash').returns('replacement');
    unhashableStates = [unhashableState];
  }));

  describe('does nothing', () => {
    it('if missing input', () => {
      expect(() => {
        unhashUrl();
      }).to.not.throwError();
    });

    it('if just a host and port', () => {
      const url = 'https://localhost:5601';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if just a path', () => {
      const url = 'https://localhost:5601/app/kibana';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if just a path and query', () => {
      const url = 'https://localhost:5601/app/kibana?foo=bar';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if empty hash with query', () => {
      const url = 'https://localhost:5601/app/kibana?foo=bar#';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if empty hash without query', () => {
      const url = 'https://localhost:5601/app/kibana#';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if empty hash without query', () => {
      const url = 'https://localhost:5601/app/kibana#';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if hash is just a path', () => {
      const url = 'https://localhost:5601/app/kibana#/discover';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });

    it('if hash does not have matching query string vals', () => {
      const url = 'https://localhost:5601/app/kibana#/discover?foo=bar';
      expect(unhashUrl(url, unhashableStates)).to.be(url);
    });
  });

  it('replaces query string vals in hash for matching states with output of state.toRISON()', () => {
    const urlWithHashes = 'https://localhost:5601/#/?foo=bar&testParam=hash';
    const exp = 'https://localhost:5601/#/?foo=bar&testParam=replacement';
    expect(unhashUrl(urlWithHashes, unhashableStates)).to.be(exp);
  });
});
