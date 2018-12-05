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

import { validateIndexPattern } from './validate_index_pattern';
import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from '../constants';

describe('Index Pattern Validation', () => {
  it('should not allow empty pattern', () => {
    expect(typeof validateIndexPattern().error).toBe('string');
    expect(typeof validateIndexPattern(' ').error).toBe('string');
  });

  it('should not allow space in the pattern', () => {
    expect(typeof validateIndexPattern('my pattern').error).toBe('string');
  });

  it('should not allow illegal characters', () => {
    INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.forEach((char) => {
      expect(typeof validateIndexPattern(`pattern${char}`).error).toBe('string');
    });
  });

  it('should return a "null" error when pattern is valid', () => {
    expect(validateIndexPattern('my-pattern-*').error).toBe(null);
  });
});
