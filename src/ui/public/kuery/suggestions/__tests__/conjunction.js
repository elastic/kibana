/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';
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
    expect(suggestions.length).to.be(2);
    suggestions.forEach(suggestion => {
      expect(suggestion.description.length).to.be.greaterThan(0);
    });
  });
});
