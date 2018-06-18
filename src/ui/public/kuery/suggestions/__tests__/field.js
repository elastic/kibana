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
import { getSuggestionsProvider } from '../field';
import indexPatternResponse from '../../__tests__/index_pattern_response.json';
import { isFilterable } from '../../../index_patterns/static_utils';

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
      expect(suggestion.description.length).to.be.greaterThan(0);
    });
  });
});
