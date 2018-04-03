import expect from 'expect.js';
import ngMock from 'ng_mock';
import { getSuggestionsProvider } from '../field';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('Kuery field suggestions', function () {
  let indexPattern;
  let indexPatterns;
  let getSuggestions;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    indexPattern = Private(StubbedLogstashIndexPatternProvider);
    indexPatterns = [indexPattern];
    getSuggestions = getSuggestionsProvider({ indexPatterns });
  }));

  it('should return a function', function () {
    expect(typeof getSuggestions).to.be('function');
  });

  it('should return filterable fields', function () {
    const prefix = '';
    const suffix = '';
    const suggestions = getSuggestions({ prefix, suffix });
    const filterableFields = indexPattern.fields.filter(field => field.filterable);
    expect(suggestions.length).to.be(filterableFields.length);
  });

  it('should filter suggestions based on the query', () => {
    const prefix = 'machine';
    const suffix = '';
    const suggestions = getSuggestions({ prefix, suffix });
    expect(suggestions.find(({ text }) => text === 'machine.os ')).to.be.ok();
  });

  it('should filter suggestions case insensitively', () => {
    const prefix = 'MACHINE';
    const suffix = '';
    const suggestions = getSuggestions({ prefix, suffix });
    expect(suggestions.find(({ text }) => text === 'machine.os ')).to.be.ok();
  });

  it('should return suggestions where the query matches somewhere in the middle', () => {
    const prefix = '.';
    const suffix = '';
    const suggestions = getSuggestions({ prefix, suffix });
    expect(suggestions.find(({ text }) => text === 'machine.os ')).to.be.ok();
  });

  it('should return field names that start with the query first', () => {
    const prefix = 'e';
    const suffix = '';
    const suggestions = getSuggestions({ prefix, suffix });
    const extensionIndex = suggestions.findIndex(({ text }) => text === 'extension ');
    const bytesIndex = suggestions.findIndex(({ text }) => text === 'bytes ');
    expect(extensionIndex).to.be.lessThan(bytesIndex);
  });

  it('should sort keyword fields before analyzed versions', () => {
    const prefix = '';
    const suffix = '';
    const suggestions = getSuggestions({ prefix, suffix });
    const analyzedIndex = suggestions.findIndex(({ text }) => text === 'machine.os ');
    const keywordIndex = suggestions.findIndex(({ text }) => text === 'machine.os.raw ');
    expect(keywordIndex).to.be.lessThan(analyzedIndex);
  });

  it('should have descriptions', function () {
    const prefix = '';
    const suffix = '';
    const suggestions = getSuggestions({ prefix, suffix });
    expect(suggestions.length).to.be.greaterThan(0);
    suggestions.forEach(suggestion => {
      expect(suggestion.description.length).to.be.greaterThan(0);
    });
  });
});
