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
import { getSuggestionsProvider } from '../operator';
import indexPatternResponse from '../../__tests__/index_pattern_response.json';

describe('Kuery operator suggestions', function () {
  let indexPatterns;
  let getSuggestions;

  beforeEach(() => {
    indexPatterns = [indexPatternResponse];
    getSuggestions = getSuggestionsProvider({ indexPatterns });
  });

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
