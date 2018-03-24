import expect from 'expect.js';
import ngMock from 'ng_mock';
import { getSuggestionsProvider } from '../operator';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('Kuery operator suggestions', function () {
  let indexPatterns;
  let getSuggestions;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    indexPatterns = [Private(StubbedLogstashIndexPatternProvider)];
    getSuggestions = getSuggestionsProvider({ indexPatterns });
  }));

  it('should return a function', function () {
    expect(typeof getSuggestions).to.be('function');
  });

  it('should not return suggestions for non-fields', () => {
    const fieldName = 'foo';
    const suggestions = getSuggestions({ fieldName });
    expect(suggestions.length).to.eql([]);
  });

  it('should return exists for every field', () => {
    const fieldName = 'custom_user_field';
    const suggestions = getSuggestions({ fieldName });
    expect(suggestions.length).to.eql(1);
    expect(suggestions[0].text).to.be(':* ');
  });

  it('should return equals for string fields', () => {
    const fieldName = 'machine.os';
    const suggestions = getSuggestions({ fieldName });
    expect(suggestions.find(({ text }) => text === ': ')).to.be.ok();
    expect(suggestions.find(({ text }) => text === '< ')).to.not.be.ok();
  });

  it('should return numeric operators for numeric fields', () => {
    const fieldName = 'bytes';
    const suggestions = getSuggestions({ fieldName });
    expect(suggestions.find(({ text }) => text === ': ')).to.be.ok();
    expect(suggestions.find(({ text }) => text === '< ')).to.be.ok();
  });

  it('should have descriptions', function () {
    const fieldName = 'bytes';
    const suggestions = getSuggestions({ fieldName });
    expect(suggestions.length).to.be.greaterThan(0);
    suggestions.forEach(suggestion => {
      expect(suggestion.description.length).to.be.greaterThan(0);
    });
  });
});
