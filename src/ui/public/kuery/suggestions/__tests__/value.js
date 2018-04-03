import expect from 'expect.js';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import { getSuggestionsProvider } from '../value';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('Kuery value suggestions', function () {
  let $http;
  let config;
  let indexPatterns;
  let getSuggestions;

  const mockValues = ['foo', 'bar'];

  beforeEach(ngMock.module('kibana'));

  describe('with config setting turned off', () => {
    beforeEach(ngMock.inject(function (Private) {
      $http = getHttpStub(false, mockValues);
      config = getConfigStub(false);
      indexPatterns = [Private(StubbedLogstashIndexPatternProvider)];
      getSuggestions = getSuggestionsProvider({ $http, config, indexPatterns });
    }));

    it('should return a function', function () {
      expect(typeof getSuggestions).to.be('function');
    });

    it('should not make a request for suggestions', async () => {
      const fieldName = 'machine.os.raw';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      sinon.assert.notCalled($http.post);
      expect(suggestions).to.eql([]);
    });
  });

  describe('with config setting turned on', () => {
    beforeEach(ngMock.inject(function (Private) {
      $http = getHttpStub(false, mockValues);
      config = getConfigStub(true);
      indexPatterns = [Private(StubbedLogstashIndexPatternProvider)];
      getSuggestions = getSuggestionsProvider({ $http, config, indexPatterns });
    }));

    it('should return a function', function () {
      expect(typeof getSuggestions).to.be('function');
    });

    it('should return boolean suggestions for boolean fields', async () => {
      const fieldName = 'ssl';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions.map(({ text }) => text)).to.eql(['true ', 'false ']);
    });

    it('should filter boolean suggestions for boolean fields', async () => {
      const fieldName = 'ssl';
      const prefix = 'fa';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions.map(({ text }) => text)).to.eql(['false ']);
    });

    it('should return boolean suggestions for boolean fields', async () => {
      const fieldName = 'ssl';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions.map(({ text }) => text)).to.eql(['true ', 'false ']);
    });

    it('should not make a request for non-aggregatable fields', async () => {
      const fieldName = 'non-sortable';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      sinon.assert.notCalled($http.post);
      expect(suggestions).to.eql([]);
    });

    it('should not make a request for non-string fields', async () => {
      const fieldName = 'bytes';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      sinon.assert.notCalled($http.post);
      expect(suggestions).to.eql([]);
    });

    it('should make a request for string fields', async () => {
      const fieldName = 'machine.os.raw';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      sinon.assert.calledOnce($http.post);
      expect(suggestions.map(({ text }) => text)).to.eql(['"foo" ', '"bar" ']);
    });

    it('should not have descriptions', async () => {
      const fieldName = 'ssl';
      const prefix = '';
      const suffix = '';
      const suggestions = await getSuggestions({ fieldName, prefix, suffix });
      expect(suggestions.length).to.be.greaterThan(0);
      suggestions.forEach(suggestion => {
        expect(suggestion.description).to.not.be.ok();
      });
    });
  });
});

function getConfigStub(suggestValues) {
  const get = sinon.stub().returns(suggestValues);
  return { get };
}

function getHttpStub(reject, data) {
  const post = sinon.stub().returns(reject ? Promise.reject() : Promise.resolve({ data }));
  return { post };
}
