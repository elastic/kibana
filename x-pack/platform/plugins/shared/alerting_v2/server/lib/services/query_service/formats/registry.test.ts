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

  it('fails fast on an unregistered name', () => {
    const unregistered: string = 'csv';

    // @ts-expect-error - unregistered name is not in the union
    expect(() => getEsqlResponseFormat(unregistered)).toThrow();
  });
});
