/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getSuggestionsProvider } from '../conjunction';

describe('Kuery conjunction suggestions', function () {
  const getSuggestions = getSuggestionsProvider();

  it('should return a function', function () {
    expect(typeof getSuggestions).to.be('function');
  });

  it('should not suggest anything for phrases not ending in whitespace', function () {
    const text = 'foo';
    const suggestions = getSuggestions({ text });
    expect(suggestions).to.eql([]);
  });

  it('should suggest and/or for phrases ending in whitespace', function () {
    const text = 'foo ';
    const suggestions = getSuggestions({ text });
    expect(suggestions.length).to.be(2);
    expect(suggestions.map(suggestion => suggestion.text)).to.eql(['and ', 'or ']);
  });

  it('should suggest to insert the suggestion at the end of the string', function () {
    const text = 'bar ';
    const end = text.length;
    const suggestions = getSuggestions({ text, end });
    expect(suggestions.length).to.be(2);
    expect(suggestions.map(suggestion => suggestion.start)).to.eql([end, end]);
    expect(suggestions.map(suggestion => suggestion.end)).to.eql([end, end]);
  });
  it('should have descriptions', function () {
    const text = ' ';
    const suggestions = getSuggestions({ text });
    expect(typeof suggestions).to.be('object');
    expect(Object.keys(suggestions).length).to.be(2);
    suggestions.forEach(suggestion => {
      expect(typeof suggestion).to.be('object');
      expect(suggestion).to.have.property('description');
    });
  });
});
