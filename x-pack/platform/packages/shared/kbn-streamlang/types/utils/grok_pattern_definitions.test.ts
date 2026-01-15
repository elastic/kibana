/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unwrapPatternDefinitions } from './grok_pattern_definitions';

describe('unwrapPatternDefinitions', () => {
  test('should inline pattern definitions', () => {
    const result = unwrapPatternDefinitions({
      patterns: ['%{FAVORITE_CAT:pet}'],
      pattern_definitions: {
        FAVORITE_CAT: 'burmese',
      },
    });
    expect(result[0]).toEqual('(?<pet>burmese)');
  });

  test('should inline nested pattern definitions', () => {
    const result = unwrapPatternDefinitions({
      patterns: ['%{FAVORITE_PET:pet}'],
      pattern_definitions: {
        FAVORITE_PET: '%{FAVORITE_CAT}',
        FAVORITE_CAT: 'burmese',
      },
    });
    expect(result[0]).toEqual('(?<pet>(burmese))');
  });

  test('should inline pattern definitions with regex', () => {
    const result = unwrapPatternDefinitions({
      patterns: ['%{IP:client.ip} \\[%{MY_TIMESTAMP:@timestamp}\\]'],
      pattern_definitions: {
        MY_TIMESTAMP: '%{MONTH} %{MONTHDAY}, %{YEAR}',
      },
    });
    expect(result[0]).toEqual('%{IP:client.ip} \\[(?<@timestamp>%{MONTH} %{MONTHDAY}, %{YEAR})\\]');
  });

  test('should escape from infinite recursion on cyclic definitions', () => {
    const result = unwrapPatternDefinitions({
      patterns: ['%{FAVORITE_PET:pet}'],
      pattern_definitions: {
        FAVORITE_PET: '%{FAVORITE_CAT}',
        FAVORITE_CAT: '%{FAVORITE_PET}',
      },
    });
    expect(result[0]).toEqual('(?<pet>(%{FAVORITE_PET}))');
  });

  test('should ignore unused pattern definitions', () => {
    const result = unwrapPatternDefinitions({
      patterns: ['%{FAVORITE_CAT:pet}'],
      pattern_definitions: {
        FAVORITE_CAT: 'burmese',
        FAVORITE_DOG: 'beagle',
      },
    });
    expect(result[0]).toEqual('(?<pet>burmese)');
  });

  test('should handle typed fields', () => {
    const result = unwrapPatternDefinitions({
      patterns: ['%{MY_NUMBER:num:int}'],
      pattern_definitions: {
        MY_NUMBER: '%{NUMBER}',
      },
    });
    expect(result[0]).toEqual('(?<num:int>%{NUMBER})');
  });

  test('should handle empty patterns', () => {
    const result = unwrapPatternDefinitions({
      patterns: [],
    });
    expect(result).toEqual([]);
  });
});
