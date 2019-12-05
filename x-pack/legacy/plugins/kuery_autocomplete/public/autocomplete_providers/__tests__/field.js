/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getSuggestionsProvider } from '../field';
import indexPatternResponse from '../__fixtures__/index_pattern_response.json';
import { isFilterable } from '../../../../../../../src/plugins/data/public';

describe('Kuery field suggestions', function () {
  let indexPattern;
  let indexPatterns;
  let getSuggestions;

  beforeEach(() => {
    indexPattern = indexPatternResponse;
    indexPatterns = [indexPattern];
    getSuggestions = getSuggestionsProvider({ indexPatterns });
  });

  it('should return a function', function () {
    expect(typeof getSuggestions).to.be('function');
  });

  it('should return filterable fields', function () {
    const prefix = '';
    const suffix = '';
    const suggestions = getSuggestions({ prefix, suffix });
    const filterableFields = indexPattern.fields.filter(isFilterable);
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
      expect(suggestion).to.have.property('description');
    });
  });

  describe('nested fields', function () {

    it('should automatically wrap nested fields in KQL\'s nested syntax', () => {
      const prefix = 'ch';
      const suffix = '';
      const suggestions = getSuggestions({ prefix, suffix });

      const suggestion = suggestions.find(({ field }) => field.name === 'nestedField.child');
      expect(suggestion.text).to.be('nestedField:{ child  }');

      // For most suggestions the cursor can be placed at the end of the suggestion text, but
      // for the nested field syntax we want to place the cursor inside the curly braces
      expect(suggestion.cursorIndex).to.be(20);
    });

    it('should narrow suggestions to children of a nested path if provided', () => {
      const prefix = 'ch';
      const suffix = '';

      const allSuggestions = getSuggestions({ prefix, suffix });
      expect(allSuggestions.length).to.be.greaterThan(2);

      const nestedSuggestions = getSuggestions({ prefix, suffix, nestedPath: 'nestedField' });
      expect(nestedSuggestions).to.have.length(2);
    });

    it('should not wrap the suggestion in KQL\'s nested syntax if the correct nested path is already provided', () => {
      const prefix = 'ch';
      const suffix = '';

      const suggestions = getSuggestions({ prefix, suffix, nestedPath: 'nestedField' });
      const suggestion = suggestions.find(({ field }) => field.name === 'nestedField.child');
      expect(suggestion.text).to.be('child ');
    });

    it('should handle fields nested multiple levels deep', () => {
      const prefix = 'doubly';
      const suffix = '';

      const suggestionsWithNoPath = getSuggestions({ prefix, suffix });
      expect(suggestionsWithNoPath).to.have.length(1);
      const [ noPathSuggestion ] = suggestionsWithNoPath;
      expect(noPathSuggestion.text).to.be('nestedField.nestedChild:{ doublyNestedChild  }');

      const suggestionsWithPartialPath = getSuggestions({ prefix, suffix, nestedPath: 'nestedField' });
      expect(suggestionsWithPartialPath).to.have.length(1);
      const [ partialPathSuggestion ] = suggestionsWithPartialPath;
      expect(partialPathSuggestion.text).to.be('nestedChild:{ doublyNestedChild  }');

      const suggestionsWithFullPath = getSuggestions({ prefix, suffix, nestedPath: 'nestedField.nestedChild' });
      expect(suggestionsWithFullPath).to.have.length(1);
      const [ fullPathSuggestion ] = suggestionsWithFullPath;
      expect(fullPathSuggestion.text).to.be('doublyNestedChild ');
    });
  });
});
