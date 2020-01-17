/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getSuggestionsProvider } from '../operator';
import indexPatternResponse from '../__fixtures__/index_pattern_response.json';

describe('Kuery operator suggestions', function() {
  let indexPatterns;
  let getSuggestions;

  beforeEach(() => {
    indexPatterns = [indexPatternResponse];
    getSuggestions = getSuggestionsProvider({ indexPatterns });
  });

  it('should return a function', function() {
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
    expect(suggestions[0].text).to.be(': * ');
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

  it('should have descriptions', function() {
    const fieldName = 'bytes';
    const suggestions = getSuggestions({ fieldName });
    expect(suggestions.length).to.be.greaterThan(0);
    suggestions.forEach(suggestion => {
      expect(suggestion).to.have.property('description');
    });
  });

  it('should handle nested paths', () => {
    const suggestions = getSuggestions({ fieldName: 'child', nestedPath: 'nestedField' });
    expect(suggestions.length).to.be.greaterThan(0);
  });
});
