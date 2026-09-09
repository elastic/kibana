/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { arrowFormat } from './arrow_format';
import { jsonFormat } from './json_format';
import {
  DEFAULT_ESQL_RESPONSE_FORMAT,
  ESQL_RESPONSE_FORMAT_NAMES,
  getEsqlResponseFormat,
  type EsqlResponseFormatName,
} from './registry';

describe('ES|QL response format registry', () => {
  it('lists every registered format name', () => {
    expect(ESQL_RESPONSE_FORMAT_NAMES).toEqual(['json', 'arrow']);
  });

  it('defaults to json', () => {
    expect(DEFAULT_ESQL_RESPONSE_FORMAT).toBe('json');
  });

  it('resolves each registered name to its format', () => {
    expect(getEsqlResponseFormat('json')).toBe(jsonFormat);
    expect(getEsqlResponseFormat('arrow')).toBe(arrowFormat);
  });

  it('resolves every listed name, so no name can be advertised without an implementation', () => {
    for (const name of ESQL_RESPONSE_FORMAT_NAMES) {
      expect(getEsqlResponseFormat(name).name).toBe(name);
    }
  });

  it('fails fast on an unregistered name', () => {
    // Widened through `string` because asserting the literal 'csv' directly into
    // the name union is a non-overlapping conversion TypeScript rejects.
    const unregistered: string = 'csv';

    expect(() => getEsqlResponseFormat(unregistered as EsqlResponseFormatName)).toThrow(
      'Unknown ES|QL response format: csv'
    );
  });

  it('infers the format name union from the registry rather than widening to string', () => {
    // Compile-time guard: a format declared `: EsqlResponseFormat` instead of
    // `satisfies` would widen this union to `string` and fail to assign here.
    const asNarrowName = (name: EsqlResponseFormatName): 'json' | 'arrow' => name;

    expect(ESQL_RESPONSE_FORMAT_NAMES.map(asNarrowName)).toEqual(['json', 'arrow']);
  });
});
