/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateProperties, isObject } from './mappings_validator';

jest.mock('ui/index_patterns', () => ({
  ILLEGAL_CHARACTERS: '',
  validateIndexPattern: () => ({}),
}));

describe('Properties validator', () => {
  it('should convert non object to empty object', () => {
    const tests = ['abc', 123, [], null, undefined];

    tests.forEach(testValue => {
      const { value, error } = validateProperties(testValue as any);
      expect(isObject(value)).toBe(true);
      expect(error).toBe(undefined);
    });
  });

  it('should strip non object fields', () => {
    const properties = {
      prop1: { type: 'text' },
      prop2: 'abc', // To be removed
      prop3: 123, // To be removed
      prop4: null, // To be removed
      prop5: [], // To be removed
      prop6: {
        type: 'object',
        properties: {
          prop1: { type: 'text' },
          prop2: 'abc', // To be removed
        },
      },
    };
    const { value, error } = validateProperties(properties as any);

    expect(Object.keys(value)).toEqual(['prop1', 'prop6']);
    expect(error!.propertiesRemoved).toEqual(['prop2', 'prop3', 'prop4', 'prop5', 'prop6.prop2']);
  });

  it(`should strip fields that dont't have a "type" defined`, () => {
    const properties = {
      prop1: { type: 'text' },
      prop2: {},
      prop3: {
        type: 'object',
        properties: {
          prop1: {},
          prop2: { type: 'keyword' },
        },
      },
    };
    const { value, error } = validateProperties(properties as any);

    expect(Object.keys(value)).toEqual(['prop1', 'prop3']);
    expect(error!.propertiesRemoved).toEqual(['prop2', 'prop3.prop1']);
  });

  it('should strip field whose type is not a string or is unknown', () => {
    const properties = {
      prop1: { type: 123 },
      prop2: { type: 'clearlyUnknown' },
    };

    const { value, error } = validateProperties(properties as any);

    expect(Object.keys(value)).toEqual([]);
    expect(error!.propertiesRemoved).toEqual(['prop1', 'prop2']);
  });

  it('should strip parameters that are unknown', () => {
    const properties = {
      prop1: { type: 'text', unknown: true, anotherUnknown: 123 },
      prop2: { type: 'keyword', store: true, index: true, doc_values_binary: true },
      prop3: {
        type: 'object',
        properties: {
          hello: { type: 'keyword', unknown: true, anotherUnknown: 123 },
        },
      },
    };

    const { value } = validateProperties(properties as any);

    expect(value).toEqual({
      prop1: { type: 'text' },
      prop2: { type: 'keyword', store: true, index: true, doc_values_binary: true },
      prop3: {
        type: 'object',
        properties: {
          hello: { type: 'keyword' },
        },
      },
    });
  });

  it(`should strip parameters whose value don't have the valid type.`, () => {
    const properties = {
      // All the parameters in "wrongField" have a wrong format defined
      // and should be stripped out when running the validation
      wrongField: {
        type: 'text',
        store: 'abc',
        index: 'abc',
        doc_values: { a: 123 },
        doc_values_binary: null,
        fielddata: [''],
        fielddata_frequency_filter: [123, 456],
        coerce: 1234,
        coerce_shape: '',
        ignore_malformed: 0,
        null_value: {},
        null_value_numeric: 'abc',
        null_value_boolean: [],
        copy_to: [],
        max_input_length: true,
        locale: 1,
        orientation: [],
        boost: { a: 123 },
        scaling_factor: 1,
        dynamic: [true],
        enabled: 'false',
        format: null,
        analyzer: 1,
        search_analyzer: null,
        search_quote_analyzer: {},
        normalizer: [],
        index_options: 1,
        index_options_keyword: true,
        index_options_flattened: [],
        eager_global_ordinals: 123,
        index_phrases: null,
        preserve_separators: 'abc',
        preserve_position_increments: [],
        ignore_z_value: {},
        points_only: [true],
        norms: 'false',
        norms_keyword: 'abc',
        term_vector: ['no'],
        path: [null],
        position_increment_gap: 'abc',
        index_prefixes: { min_chars: [], max_chars: 'abc' },
        similarity: 1,
        split_queries_on_whitespace: {},
        ignore_above: 'abc',
        enable_position_increments: [],
        depth_limit: true,
        dims: false,
      },
      // All the parameters in "goodField" have the correct format
      // and should still be there after the validation ran.
      goodField: {
        type: 'text',
        store: true,
        index: true,
        doc_values: true,
        doc_values_binary: true,
        fielddata: true,
        fielddata_frequency_filter: { min: 1, max: 2, min_segment_size: 10 },
        coerce: true,
        coerce_shape: true,
        ignore_malformed: true,
        null_value: 'NULL',
        null_value_numeric: 1,
        null_value_boolean: 'true',
        copy_to: 'abc',
        max_input_length: 10,
        locale: 'en',
        orientation: 'ccw',
        boost: 1.5,
        scaling_factor: 'abc',
        dynamic: true,
        enabled: true,
        format: 'strict_date_optional_time',
        analyzer: 'standard',
        search_analyzer: 'standard',
        search_quote_analyzer: 'standard',
        normalizer: 'standard',
        index_options: 'positions',
        index_options_keyword: 'docs',
        index_options_flattened: 'docs',
        eager_global_ordinals: true,
        index_phrases: true,
        preserve_separators: true,
        preserve_position_increments: true,
        ignore_z_value: true,
        points_only: true,
        norms: true,
        norms_keyword: true,
        term_vector: 'no',
        path: 'abc',
        position_increment_gap: 100,
        index_prefixes: { min_chars: 2, max_chars: 5 },
        similarity: 'BM25',
        split_queries_on_whitespace: true,
        ignore_above: 64,
        enable_position_increments: true,
        depth_limit: 20,
        dims: 'abc',
      },
    };

    const { value, error } = validateProperties(properties as any);

    expect(Object.keys(value)).toEqual(['wrongField', 'goodField']);

    expect(value.wrongField).toEqual({ type: 'text' }); // All parameters have been stripped out but the "type".
    expect(value.goodField).toEqual(properties.goodField); // All parameters are stil there.

    expect(error).not.toBe(undefined);
    expect(Object.keys(error!.parametersRemoved)).toEqual(['wrongField']);
    expect(error!.parametersRemoved.wrongField).toEqual(
      Object.keys(properties.wrongField).filter(v => v !== 'type') // All parameters but the "type"
    );
  });
});
